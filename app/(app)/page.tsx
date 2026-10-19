import { KindFilter } from "@/components/KindFilter";
import MapLoader from "@/components/MapLoader";
import { typeFromSlug } from "@/lib/places";
import { getPlaceTypes } from "@/lib/queries/categories";
import { getRestaurantMarkers } from "@/lib/queries/restaurants";

export const dynamic = "force-dynamic";

export default async function MapPage(props: PageProps<"/">) {
  const { tipo } = await props.searchParams;
  const types = await getPlaceTypes();
  const type = typeFromSlug(types, tipo);
  const places = await getRestaurantMarkers(types, type);
  const visited = places.filter((p) => p.status === "VISITED").length;
  const pending = places.length - visited;

  return (
    <div className="relative flex min-h-0 flex-1">
      {/* Remount on filter change so the map re-fits the visible pins. */}
      <MapLoader key={type?.key ?? "all"} restaurants={places} />

      <div className="absolute top-3 left-14 z-[500]">
        <KindFilter basePath="/" types={types} active={type} compact />
      </div>

      <div className="card pointer-events-none absolute top-3 right-3 z-[500] flex flex-col gap-1.5 px-3.5 py-2.5 text-sm">
        <span className="flex items-center gap-2 text-stone-700">
          <span className="size-2.5 rounded-full bg-amber-500" />
          Pendientes
          <span className="ml-auto pl-3 font-semibold text-stone-900">
            {pending}
          </span>
        </span>
        <span className="flex items-center gap-2 text-stone-700">
          <span className="size-2.5 rounded-full bg-emerald-600" />
          Visitados
          <span className="ml-auto pl-3 font-semibold text-stone-900">
            {visited}
          </span>
        </span>
      </div>
    </div>
  );
}
