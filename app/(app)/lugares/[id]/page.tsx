import { AdaptiveImage } from "@/components/AdaptiveImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddPhotosForm } from "@/components/AddPhotosForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DishForm } from "@/components/DishForm";
import MapLoader from "@/components/MapLoader";
import { PhotoGallery } from "@/components/PhotoGallery";
import { TripAlbum } from "@/components/TripAlbum";
import { VisitHeader } from "@/components/VisitHeader";
import { VisitForm } from "@/components/VisitForm";
import { formatDate, formatDateRange, toDateInputValue } from "@/lib/format";
import { typeOf } from "@/lib/places";
import { getPlaceTypes } from "@/lib/queries/categories";
import { getRestaurantDetail } from "@/lib/queries/restaurants";
import {
  deleteRestaurant,
  markVisited,
  updateVisit,
  addDish,
  updateDish,
  deleteDish,
  addPhotos,
  deletePhoto,
} from "@/lib/actions/restaurants";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function RestaurantDetailPage({ params }: Props) {
  const { id } = await params;
  const restaurantId = Number(id);
  if (!Number.isInteger(restaurantId)) notFound();

  const [data, types] = await Promise.all([
    getRestaurantDetail(restaurantId),
    getPlaceTypes(),
  ]);
  if (!data) notFound();
  const { restaurant, visit } = data;
  const isVisited = restaurant.status === "VISITED";
  const kind = typeOf(types, restaurant);
  const backHref = `${isVisited ? "/visitados" : "/pendientes"}?tipo=${kind.slug}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <Link
        href={backHref}
        className="self-start text-sm font-medium text-stone-500 transition hover:text-stone-900"
      >
        ← {isVisited ? "Visitados" : "Pendientes"}
      </Link>

      {/* ---------- Header: photos (sized to their real shape) + text ---------- */}
      <VisitHeader
        cover={
          visit?.coverUrl
            ? {
                src: visit.coverUrl,
                alt: `Foto en ${restaurant.name}`,
                ratio: visit.coupleImageRatio,
              }
            : null
        }
        place={
          visit?.placeUrl
            ? {
                src: visit.placeUrl,
                alt: `El lugar: ${restaurant.name}`,
                ratio: visit.placeImageRatio,
              }
            : null
        }
      >
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isVisited
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                }`}
              >
                {isVisited ? "Visitado" : "Pendiente"}
              </span>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                {kind.icon} {kind.label}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              {restaurant.name}
            </h1>
            {restaurant.address && (
              <p className="text-sm text-stone-500">📍 {restaurant.address}</p>
            )}
            {!visit && restaurant.eventDate && (
              <p className="text-sm font-medium text-stone-700">
                🗓 {formatDate(restaurant.eventDate)}
              </p>
            )}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="link self-start text-sm"
            >
              Ver en el mapa ↗
            </a>
          </div>

          {visit && (
            <div className="flex flex-col gap-2 border-t border-stone-100 pt-4">
              <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
                {formatDateRange(visit.visitDate, visit.endDate)}
              </p>
              <p className="text-base leading-relaxed whitespace-pre-line text-stone-700">
                {visit.description}
              </p>
            </div>
          )}

          {restaurant.notes && (
            <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
              {restaurant.notes}
            </p>
          )}

          {/* Beside a cover photo the map is just filler; show it only without one. */}
          {!visit?.coverUrl && (
            <div className="h-48 w-full overflow-hidden rounded-xl border border-stone-200">
              <MapLoader
                restaurants={[
                  {
                    id: String(restaurant.id),
                    name: restaurant.name,
                    address: restaurant.address,
                    lat: restaurant.lat,
                    lng: restaurant.lng,
                    status: restaurant.status,
                    kind: restaurant.kind,
                    icon: kind.icon,
                    typeLabel: kind.label,
                  },
                ]}
                center={[restaurant.lat, restaurant.lng]}
                zoom={15}
                scrollWheelZoom={false}
              />
            </div>
          )}

          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            <Link
              href={`/lugares/${restaurant.id}/editar`}
              className="btn-secondary"
            >
              Editar datos
            </Link>
            <form action={deleteRestaurant.bind(null, restaurant.id)}>
              <ConfirmButton
                message={`¿Eliminar "${restaurant.name}"? Se borran también la visita y todas las fotos.`}
              >
                Eliminar
              </ConfirmButton>
            </form>
          </div>
        </div>
      </VisitHeader>

      {/* ---------- Pending: mark as visited ---------- */}
      {!visit && (
        <section className="card flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-stone-900">
              ¿Ya fueron?
            </h2>
            <p className="text-sm text-stone-500">
              {restaurant.kind === "RESTAURANT"
                ? "Contá cómo les fue y qué comieron para marcarlo como visitado."
                : "Contá cómo les fue y sumá fotos para marcarlo como visitado."}
            </p>
          </div>
          <VisitForm
            action={markVisited.bind(null, restaurant.id)}
            kind={restaurant.kind}
            suggestedDate={
              restaurant.eventDate
                ? toDateInputValue(restaurant.eventDate)
                : undefined
            }
          />
        </section>
      )}

      {/* ---------- Visited: edit the visit, then its dishes ---------- */}
      {visit && (
        <>
          <details className="group card">
            <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium text-stone-700 transition select-none hover:text-stone-900">
              <span className="inline-block transition group-open:rotate-90">
                ›
              </span>{" "}
              Editar visita
            </summary>
            <div className="border-t border-stone-200 p-5">
              <VisitForm
                action={updateVisit.bind(null, visit.id, restaurant.id)}
                kind={restaurant.kind}
                defaultValues={{
                  visitDate: toDateInputValue(visit.visitDate),
                  endDate: visit.endDate
                    ? toDateInputValue(visit.endDate)
                    : null,
                  description: visit.description,
                }}
                submitLabel="Guardar cambios"
              />
            </div>
          </details>

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
                onDelete={deletePhoto.bind(null, restaurant.id)}
              />
            ) : visit.photos.length > 0 ? (
              <PhotoGallery
                photos={visit.photos}
                title={restaurant.name}
                onDelete={deletePhoto.bind(null, restaurant.id)}
              />
            ) : (
              <p className="text-sm text-stone-500">Todavía no hay fotos.</p>
            )}
            <details className="group rounded-2xl border border-dashed border-stone-300 bg-white/60 transition open:bg-white">
              <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-brand-600 transition select-none hover:text-brand-700">
                + Agregar fotos
              </summary>
              <div className="border-t border-stone-200 p-4">
                <AddPhotosForm
                  action={addPhotos.bind(null, visit.id, restaurant.id)}
                />
              </div>
            </details>
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
                  Todavía no cargaste platos.
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
                      <p className="font-semibold text-stone-900">
                        {dish.name}
                      </p>
                      {dish.description && (
                        <p className="text-sm whitespace-pre-line text-stone-600">
                          {dish.description}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-start gap-x-4 gap-y-2 pt-2">
                        <details className="group w-full">
                          <summary className="cursor-pointer list-none text-sm font-medium text-brand-600 transition select-none hover:text-brand-700">
                            Editar plato
                          </summary>
                          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
                            <DishForm
                              action={updateDish.bind(
                                null,
                                dish.id,
                                restaurant.id,
                              )}
                              defaultValues={dish}
                              submitLabel="Guardar"
                            />
                            <form
                              action={deleteDish.bind(
                                null,
                                dish.id,
                                restaurant.id,
                              )}
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
                    </div>
                  </li>
                ))}
              </ul>

              <details className="group rounded-2xl border border-dashed border-stone-300 bg-white/60 transition open:bg-white">
                <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-brand-600 transition select-none hover:text-brand-700">
                  + Agregar plato
                </summary>
                <div className="border-t border-stone-200 p-4">
                  <DishForm
                    action={addDish.bind(null, visit.id, restaurant.id)}
                    submitLabel="Agregar plato"
                  />
                </div>
              </details>
            </section>
          )}
        </>
      )}
    </div>
  );
}
