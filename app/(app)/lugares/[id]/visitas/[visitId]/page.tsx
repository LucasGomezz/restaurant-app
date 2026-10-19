import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VisitHeader } from "@/components/VisitHeader";
import { VisitSections } from "@/components/VisitSections";
import { formatDateRange } from "@/lib/format";
import { typeOf } from "@/lib/places";
import { getPlaceTypes } from "@/lib/queries/categories";
import { getRestaurantDetail } from "@/lib/queries/restaurants";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string; visitId: string }> };

/** One past visit of a place, on its own page. */
export default async function VisitPage({ params }: Props) {
  const { id, visitId } = await params;
  const restaurantId = Number(id);
  if (!Number.isInteger(restaurantId)) notFound();

  const [data, types] = await Promise.all([
    getRestaurantDetail(restaurantId),
    getPlaceTypes(),
  ]);
  if (!data) notFound();
  const { restaurant, visits } = data;
  const index = visits.findIndex((visit) => String(visit.id) === visitId);
  if (index === -1) notFound();

  const visit = visits[index];
  const kind = typeOf(types, restaurant);
  const placeHref = `/lugares/${restaurant.id}`;
  if (index === 0) redirect(placeHref);
  // Visits are newest first; the newest one lives on the place page itself.
  const newerHref =
    index === 1 ? placeHref : `${placeHref}/visitas/${visits[index - 1].id}`;
  const older = visits[index + 1];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <Link
        href={placeHref}
        className="self-start text-sm font-medium text-stone-500 transition hover:text-stone-900"
      >
        ← {restaurant.name}
      </Link>

      <VisitHeader
        cover={
          visit.coverUrl
            ? {
                src: visit.coverUrl,
                alt: `Foto en ${restaurant.name}`,
                ratio: visit.coupleImageRatio,
              }
            : null
        }
        place={
          visit.placeUrl
            ? {
                src: visit.placeUrl,
                alt: `El lugar: ${restaurant.name}`,
                ratio: visit.placeImageRatio,
              }
            : null
        }
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              🔁 Visita {visits.length - index} de {visits.length}
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
              {kind.icon} {kind.label}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            {restaurant.name}
          </h1>
          <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
            {formatDateRange(visit.visitDate, visit.endDate)}
          </p>
          <p className="text-base leading-relaxed whitespace-pre-line text-stone-700">
            {visit.description}
          </p>
        </div>
      </VisitHeader>

      <VisitSections
        visit={visit}
        restaurant={restaurant}
        isOnlyVisit={visits.length === 1}
      />

      <nav className="flex justify-between gap-3 border-t border-stone-200 pt-4 text-sm font-medium">
        <Link href={newerHref} className="link">
          ← Visita más nueva
        </Link>
        {older && (
          <Link
            href={`${placeHref}/visitas/${older.id}`}
            className="link text-right"
          >
            Visita anterior →
          </Link>
        )}
      </nav>
    </div>
  );
}
