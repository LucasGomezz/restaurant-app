import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { KindFilter } from "@/components/KindFilter";
import { PageHeader } from "@/components/PageHeader";
import { formatDateRange } from "@/lib/format";
import { KINDS, kindFromSlug } from "@/lib/places";
import { getVisitedRestaurants } from "@/lib/queries/restaurants";

export const dynamic = "force-dynamic";

export default async function VisitadosPage(props: PageProps<"/visitados">) {
  const { tipo } = await props.searchParams;
  const kind = kindFromSlug(tipo);
  const places = await getVisitedRestaurants(kind);
  const what = kind ? KINDS[kind].plural.toLowerCase() : "lugares";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Visitados"
        description={
          places.length > 0
            ? `${places.length} ${places.length === 1 ? "recuerdo" : "recuerdos"}`
            : undefined
        }
      />
      <KindFilter basePath="/visitados" active={kind} />

      {places.length === 0 ? (
        <EmptyState
          icon={kind ? KINDS[kind].icon : "📸"}
          message={`Todavía no marcaron ${what} como visitados.`}
          actionHref={
            kind ? `/pendientes?tipo=${KINDS[kind].slug}` : "/pendientes"
          }
          actionLabel="Ver pendientes"
        />
      ) : (
        <>
          {/* One layout per breakpoint: columns are filled server-side, so
              cards never jump around while photos load. */}
          <MasonryGrid places={places} columns={2} className="flex sm:hidden" />
          <MasonryGrid
            places={places}
            columns={3}
            className="hidden sm:flex lg:hidden"
          />
          <MasonryGrid places={places} columns={4} className="hidden lg:flex" />
        </>
      )}
    </div>
  );
}

type VisitedPlace = Awaited<ReturnType<typeof getVisitedRestaurants>>[number];

/** Frame shape for a card: the photo's own, kept within sane bounds. */
function frameRatio(place: VisitedPlace) {
  if (!place.coverUrl) return 3 / 4;
  return Math.min(4 / 3, Math.max(9 / 16, place.coverRatio ?? 9 / 16));
}

/**
 * Pinterest-style columns: each card takes its photo's shape and goes into the
 * currently shortest column, so the newest stay near the top, left to right.
 */
function MasonryGrid({
  places,
  columns,
  className,
}: {
  places: VisitedPlace[];
  columns: number;
  className: string;
}) {
  const stacks: VisitedPlace[][] = Array.from({ length: columns }, () => []);
  const heights = Array(columns).fill(0);
  for (const place of places) {
    const shortest = heights.indexOf(Math.min(...heights));
    stacks[shortest].push(place);
    // Card height in column widths: the photo plus the caption below it.
    heights[shortest] += 1 / frameRatio(place) + 0.3;
  }

  return (
    <div className={`items-start gap-4 ${className}`}>
      {stacks.map((stack, index) => (
        <ul key={index} className="flex min-w-0 flex-1 flex-col gap-4">
          {stack.map((place) => (
            <li key={place.id}>
              <VisitedCard place={place} columns={columns} />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

function VisitedCard({
  place,
  columns,
}: {
  place: VisitedPlace;
  columns: number;
}) {
  return (
    <Link
      href={`/lugares/${place.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className="relative w-full overflow-hidden bg-gradient-to-br from-brand-50 to-stone-100"
        style={{ aspectRatio: frameRatio(place) }}
      >
        {place.coverUrl ? (
          <Image
            src={place.coverUrl}
            alt={place.name}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes={`(max-width: 1024px) ${Math.round(100 / columns)}vw, 256px`}
          />
        ) : (
          <span
            className="absolute inset-0 grid place-items-center text-4xl"
            aria-hidden
          >
            {KINDS[place.kind].icon}
          </span>
        )}
        <span
          className="absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-white/90 text-sm shadow-sm"
          title={KINDS[place.kind].label}
        >
          {KINDS[place.kind].icon}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <p className="truncate text-sm font-semibold text-stone-900">
          {place.name}
        </p>
        <p className="text-xs text-stone-500">
          {formatDateRange(place.visitDate, place.endDate)}
        </p>
      </div>
    </Link>
  );
}
