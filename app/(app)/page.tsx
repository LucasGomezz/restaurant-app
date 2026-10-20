import { FolderFilter } from "@/components/FolderFilter";
import { KindFilter } from "@/components/KindFilter";
import MapLoader from "@/components/MapLoader";
import { typeFromSlug } from "@/lib/places";
import { getPlaceTypes } from "@/lib/queries/categories";
import { getMyFolders } from "@/lib/queries/folders";
import { getRestaurantMarkers } from "@/lib/queries/restaurants";

export const dynamic = "force-dynamic";

export default async function MapPage(props: PageProps<"/">) {
  const { tipo, carpeta } = await props.searchParams;
  const [types, folders] = await Promise.all([getPlaceTypes(), getMyFolders()]);
  const type = typeFromSlug(types, tipo);
  // Only the user's own folders filter; anything else shows everything.
  const folder = folders.find((f) => f.id === carpeta);
  const places = await getRestaurantMarkers(types, type, folder?.id);
  const visited = places.filter((p) => p.status === "VISITED").length;
  const pending = places.length - visited;

  return (
    <div className="relative flex min-h-0 flex-1">
      {/* Remount on filter change so the map re-fits the visible pins. */}
      <MapLoader
        key={`${type?.key ?? "all"}-${folder?.id ?? "all"}`}
        restaurants={places}
      />

      <div className="absolute top-3 right-3 left-14 z-[500] flex flex-wrap items-start gap-1.5 sm:right-44">
        <FolderFilter
          folders={folders.map(({ id, name, icon }) => ({ id, name, icon }))}
          active={folder?.id}
        />
        <KindFilter
          basePath="/"
          types={types}
          active={type}
          compact
          keep={folder ? { carpeta: folder.id } : undefined}
        />
      </div>

      {/* Hidden on phones: the filters need the width more. */}
      <div className="card pointer-events-none absolute top-3 right-3 z-[500] hidden flex-col gap-1.5 px-3.5 py-2.5 text-sm sm:flex">
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
