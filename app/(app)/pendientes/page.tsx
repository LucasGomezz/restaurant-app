import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { KindFilter } from "@/components/KindFilter";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/format";
import { KINDS, kindFromSlug } from "@/lib/places";
import { getPendingRestaurants } from "@/lib/queries/restaurants";

export const dynamic = "force-dynamic";

export default async function PendientesPage(
  props: PageProps<"/pendientes">,
) {
  const { tipo } = await props.searchParams;
  const kind = kindFromSlug(tipo);
  const places = await getPendingRestaurants(kind);
  const what = kind ? KINDS[kind].plural.toLowerCase() : "lugares";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Pendientes"
        description={
          places.length > 0
            ? `${places.length} ${places.length === 1 ? "pendiente" : "pendientes"}`
            : undefined
        }
      />
      <KindFilter basePath="/pendientes" active={kind} />

      {places.length === 0 ? (
        <EmptyState
          icon={kind ? KINDS[kind].icon : "📍"}
          message={`Todavía no agregaste ${what} pendientes.`}
          actionHref={kind ? `/lugares/nuevo?tipo=${KINDS[kind].slug}` : "/lugares/nuevo"}
          actionLabel={kind ? `Agregar ${KINDS[kind].label.toLowerCase()}` : "Agregar"}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {places.map((place) => (
            <li
              key={place.id}
              className="card group relative flex items-start gap-4 p-4 transition hover:border-brand-200 hover:shadow-md"
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-lg ring-1 ring-amber-600/15"
                title={KINDS[place.kind].label}
                aria-hidden
              >
                {KINDS[place.kind].icon}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link
                  href={`/lugares/${place.id}`}
                  className="text-base font-semibold text-stone-900 after:absolute after:inset-0 after:rounded-2xl"
                >
                  {place.name}
                </Link>
                {place.eventDate && (
                  <p className="text-sm font-medium text-brand-700">
                    🗓 {formatDate(place.eventDate)}
                  </p>
                )}
                {place.address && (
                  <p className="truncate text-sm text-stone-500">
                    {place.address}
                  </p>
                )}
                {place.notes && (
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600">
                    {place.notes}
                  </p>
                )}
              </div>
              <Link
                href={`/lugares/${place.id}/editar`}
                className="relative z-10 shrink-0 rounded-lg px-2.5 py-1 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
              >
                Editar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
