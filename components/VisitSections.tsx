import { AddPhotosForm } from "@/components/AddPhotosForm";
import { AdaptiveImage } from "@/components/AdaptiveImage";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DishForm } from "@/components/DishForm";
import { PhotoGallery } from "@/components/PhotoGallery";
import { TripAlbum } from "@/components/TripAlbum";
import { VisitForm } from "@/components/VisitForm";
import {
  addDish,
  addPhotos,
  deleteDish,
  deletePhoto,
  deleteVisit,
  updateDish,
  updateVisit,
} from "@/lib/actions/restaurants";
import { formatDate, formatDateRange, toDateInputValue } from "@/lib/format";
import type { getRestaurantDetail } from "@/lib/queries/restaurants";

export type Detail = NonNullable<
  Awaited<ReturnType<typeof getRestaurantDetail>>
>;

/** Edit form, photos and dishes of one visit. */
export function VisitSections({
  visit,
  restaurant,
  isOnlyVisit,
  canEdit,
}: {
  visit: Detail["visits"][number];
  restaurant: Detail["restaurant"];
  /** Deleting the only visit sends the place back to pending. */
  isOnlyVisit: boolean;
  /** False for view-only folder members: no edit or delete controls. */
  canEdit: boolean;
}) {
  return (
    <>
      {canEdit && (
        <details className="group card">
          <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium text-stone-700 transition select-none hover:text-stone-900">
            <span className="inline-block transition group-open:rotate-90">
              ›
            </span>{" "}
            Editar visita
          </summary>
          <div className="flex flex-col gap-5 border-t border-stone-200 p-5">
            <VisitForm
              action={updateVisit.bind(null, visit.id)}
              kind={restaurant.kind}
              defaultValues={{
                visitDate: toDateInputValue(visit.visitDate),
                endDate: visit.endDate ? toDateInputValue(visit.endDate) : null,
                description: visit.description,
              }}
              submitLabel="Guardar cambios"
            />
            <form
              action={deleteVisit.bind(null, visit.id)}
              className="border-t border-stone-200 pt-4"
            >
              <ConfirmButton
                message={`¿Eliminar la visita del ${formatDate(visit.visitDate)}? Se borran también sus fotos y platos.${
                  isOnlyVisit ? " El lugar vuelve a pendientes." : ""
                }`}
                className="cursor-pointer text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
              >
                Eliminar esta visita
              </ConfirmButton>
            </form>
          </div>
        </details>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-stone-900">
          {restaurant.kind === "TRIP" ? "Fotos del viaje" : "Fotos"}{" "}
          <span className="font-normal text-stone-400">
            {visit.photos.length > 0 && `(${visit.photos.length})`}
          </span>
        </h2>
        {visit.photos.length > 0 && restaurant.kind === "TRIP" ? (
          <TripAlbum
            photos={visit.photos}
            title={restaurant.name}
            subtitle={formatDateRange(visit.visitDate, visit.endDate)}
            onDelete={canEdit ? deletePhoto : undefined}
          />
        ) : visit.photos.length > 0 ? (
          <PhotoGallery
            photos={visit.photos}
            title={restaurant.name}
            onDelete={canEdit ? deletePhoto : undefined}
          />
        ) : (
          <p className="text-sm text-stone-500">Todavía no hay fotos.</p>
        )}
        {canEdit && (
          <details className="group rounded-2xl border border-dashed border-stone-300 bg-white/60 transition open:bg-white">
            <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-brand-600 transition select-none hover:text-brand-700">
              + Agregar fotos
            </summary>
            <div className="border-t border-stone-200 p-4">
              <AddPhotosForm
                action={addPhotos.bind(null, visit.id)}
              />
            </div>
          </details>
        )}
      </section>

      {(restaurant.kind === "RESTAURANT" || visit.dishes.length > 0) && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-stone-900">
            Platos{" "}
            <span className="font-normal text-stone-400">
              {visit.dishes.length > 0 && `(${visit.dishes.length})`}
            </span>
          </h2>

          {visit.dishes.length === 0 && (
            <p className="text-sm text-stone-500">
              Todavía no hay platos.
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {visit.dishes.map((dish) => (
              <li key={dish.id} className="card flex gap-4 p-4">
                <div className="relative aspect-[9/16] w-24 shrink-0 self-start overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 to-stone-100 sm:w-32">
                  {dish.imageDisplayUrl ? (
                    <AdaptiveImage
                      src={dish.imageDisplayUrl}
                      alt={dish.name}
                      className="object-cover"
                      sizes="128px"
                    />
                  ) : (
                    <span
                      className="absolute inset-0 grid place-items-center text-3xl"
                      aria-hidden
                    >
                      🍴
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <p className="font-semibold text-stone-900">{dish.name}</p>
                  {dish.description && (
                    <p className="text-sm whitespace-pre-line text-stone-600">
                      {dish.description}
                    </p>
                  )}
                  {canEdit && (
                    <div className="mt-auto flex flex-wrap items-start gap-x-4 gap-y-2 pt-2">
                      <details className="group w-full">
                        <summary className="cursor-pointer list-none text-sm font-medium text-brand-600 transition select-none hover:text-brand-700">
                          Editar plato
                        </summary>
                        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
                          <DishForm
                            action={updateDish.bind(null, dish.id)}
                            defaultValues={dish}
                            submitLabel="Guardar"
                          />
                          <form
                            action={deleteDish.bind(null, dish.id)}
                            className="border-t border-stone-200 pt-3"
                          >
                            <ConfirmButton
                              message={`¿Eliminar el plato "${dish.name}"?`}
                              className="cursor-pointer text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                            >
                              Eliminar plato
                            </ConfirmButton>
                          </form>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {canEdit && (
            <details className="group rounded-2xl border border-dashed border-stone-300 bg-white/60 transition open:bg-white">
              <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-brand-600 transition select-none hover:text-brand-700">
                + Agregar plato
              </summary>
              <div className="border-t border-stone-200 p-4">
                <DishForm
                  action={addDish.bind(null, visit.id)}
                  submitLabel="Agregar plato"
                />
              </div>
            </details>
          )}
        </section>
      )}
    </>
  );
}
