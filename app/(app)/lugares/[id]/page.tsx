import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import MapLoader from "@/components/MapLoader";
import { VisitHeader } from "@/components/VisitHeader";
import { VisitForm } from "@/components/VisitForm";
import { VisitSections } from "@/components/VisitSections";
import { addToFolderFromPlaceForm, removePlaceFromFolder } from "@/lib/actions/folders";
import { addVisit, deleteRestaurant } from "@/lib/actions/restaurants";
import { formatDate, formatDateRange, toDateInputValue } from "@/lib/format";
import { typeOf } from "@/lib/places";
import { getPlaceTypes } from "@/lib/queries/categories";
import { getPlaceFolders } from "@/lib/queries/folders";
import { getRestaurantDetail } from "@/lib/queries/restaurants";

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
  const { restaurant, visits, permissions, sharedBy } = data;
  const { canEdit, isOwner } = permissions;
  const folders = await getPlaceFolders(restaurant.id, isOwner);
  // The header shows the latest visit; older ones are listed below it.
  const [visit = null, ...olderVisits] = visits;
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
              {sharedBy && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  Compartido por {sharedBy.displayName}
                </span>
              )}
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
                {visits.length > 1 && (
                  <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 tracking-normal text-brand-700 normal-case">
                    🔁 Fueron {visits.length} veces
                  </span>
                )}
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

          {canEdit && (
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <Link
                href={`/lugares/${restaurant.id}/editar`}
                className="btn-secondary"
              >
                Editar datos
              </Link>
              {isOwner && (
                <form action={deleteRestaurant.bind(null, restaurant.id)}>
                  <ConfirmButton
                    message={`¿Eliminar "${restaurant.name}"? Se borran también las visitas y todas las fotos, para todos con quienes lo compartiste.`}
                  >
                    Eliminar
                  </ConfirmButton>
                </form>
              )}
            </div>
          )}
        </div>
      </VisitHeader>

      {/* ---------- Folders it's shared in ---------- */}
      {(folders.inFolders.length > 0 || folders.canAddTo.length > 0) && (
        <section className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-stone-500">Carpetas:</span>
          {folders.inFolders.map((folder) => (
            <span
              key={folder.id}
              className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white py-1 pr-1 pl-3 text-sm shadow-xs"
            >
              <Link
                href={`/carpetas/${folder.id}`}
                className="font-medium text-stone-700 hover:text-brand-700"
              >
                {folder.icon} {folder.name}
              </Link>
              {folder.canRemove && (
                <form
                  action={removePlaceFromFolder.bind(
                    null,
                    restaurant.id,
                    folder.id,
                  )}
                >
                  <button
                    type="submit"
                    aria-label={`Sacar de ${folder.name}`}
                    title="Sacar de la carpeta"
                    className="grid size-6 cursor-pointer place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-red-600"
                  >
                    ✕
                  </button>
                </form>
              )}
            </span>
          ))}
          {folders.canAddTo.length > 0 && (
            <form
              action={addToFolderFromPlaceForm.bind(null, restaurant.id)}
              className="flex items-center gap-1.5"
            >
              <select
                name="folderId"
                required
                defaultValue=""
                aria-label="Agregar a una carpeta"
                className="rounded-full border border-dashed border-stone-300 bg-white px-3 py-1 text-sm text-stone-600"
              >
                <option value="" disabled>
                  + Agregar a carpeta…
                </option>
                {folders.canAddTo.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.icon} {folder.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="link cursor-pointer text-sm">
                Agregar
              </button>
            </form>
          )}
        </section>
      )}

      {/* ---------- Pending: mark as visited ---------- */}
      {!visit && canEdit && (
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
            action={addVisit.bind(null, restaurant.id)}
            kind={restaurant.kind}
            suggestedDate={
              restaurant.eventDate
                ? toDateInputValue(restaurant.eventDate)
                : undefined
            }
          />
        </section>
      )}

      {/* ---------- Visited: the latest visit, then going back again ---------- */}
      {visit && (
        <>
          <VisitSections
            visit={visit}
            restaurant={restaurant}
            isOnlyVisit={visits.length === 1}
            canEdit={canEdit}
          />

          {canEdit && (
            <details className="group card">
              <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-semibold text-brand-600 transition select-none hover:text-brand-700">
                🔁 Volvimos: agregar otra visita
              </summary>
              <div className="border-t border-stone-200 p-5">
                <VisitForm
                  action={addVisit.bind(null, restaurant.id)}
                  kind={restaurant.kind}
                  submitLabel="Guardar visita"
                />
              </div>
            </details>
          )}
        </>
      )}

      {/* ---------- Older visits, newest first ---------- */}
      {olderVisits.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-stone-900">
            Visitas anteriores{" "}
            <span className="font-normal text-stone-400">
              ({olderVisits.length})
            </span>
          </h2>
          <ul className="flex flex-col gap-3">
            {olderVisits.map((older) => {
              const thumb =
                older.coverUrl ?? older.placeUrl ?? older.photos[0]?.url;
              return (
                <li key={older.id}>
                  <Link
                    href={`/lugares/${restaurant.id}/visitas/${older.id}`}
                    className="card group flex items-center gap-4 p-3 pr-4 transition hover:border-brand-200 hover:shadow-md"
                  >
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 to-stone-100">
                      {thumb ? (
                        // Signed URL thumbnail; a plain <img> keeps it simple.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <span
                          className="absolute inset-0 grid place-items-center text-2xl"
                          aria-hidden
                        >
                          {kind.icon}
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="text-sm font-semibold text-stone-900">
                        {formatDateRange(older.visitDate, older.endDate)}
                      </p>
                      <p className="line-clamp-2 text-sm text-stone-500">
                        {older.description}
                      </p>
                      {(older.photos.length > 0 || older.dishes.length > 0) && (
                        <p className="text-xs text-stone-400">
                          {[
                            older.photos.length > 0 &&
                              `📷 ${older.photos.length}`,
                            older.dishes.length > 0 &&
                              `🍴 ${older.dishes.length}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-xl text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600"
                      aria-hidden
                    >
                      ›
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
