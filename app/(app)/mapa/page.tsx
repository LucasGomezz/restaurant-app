import Link from "next/link";
import { FolderFilter } from "@/components/FolderFilter";
import { KindFilter } from "@/components/KindFilter";
import MapLoader from "@/components/MapLoader";
import { typeFromSlug } from "@/lib/places";
import { getPlaceTypes } from "@/lib/queries/categories";
import { getMyFolders } from "@/lib/queries/folders";
import { getRestaurantMarkers } from "@/lib/queries/restaurants";

export const dynamic = "force-dynamic";

export default async function MapPage(props: PageProps<"/mapa">) {
  const { tipo, carpeta } = await props.searchParams;
  const [types, folders] = await Promise.all([getPlaceTypes(), getMyFolders()]);
  const type = typeFromSlug(types, tipo);
  // Only the user's own folders filter; anything else shows everything.
  const folder = folders.find((f) => f.id === carpeta);
  const places = await getRestaurantMarkers(types, type, folder?.id);
  const visited = places.filter((p) => p.status === "VISITED").length;
  const pending = places.length - visited;
  // A brand-new account: nothing on the map and no filter applied.
  const isNewUser = places.length === 0 && !type && !folder;

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
        {folder && (
          <Link
            href={`/carpetas/${folder.id}`}
            className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 shadow-xs transition hover:border-stone-300 hover:text-stone-900"
          >
            Abrir carpeta →
          </Link>
        )}
        <KindFilter
          basePath="/mapa"
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
      {folder && places.length === 0 && !type && (
        <div className="pointer-events-none absolute inset-0 z-[600] grid place-items-center p-4">
          <div className="card pointer-events-auto flex max-w-sm flex-col items-center gap-3 p-6 text-center shadow-xl">
            <span className="text-3xl" aria-hidden>
              {folder.icon}
            </span>
            <p className="text-sm text-stone-600">
              Todavía no hay lugares en <strong>{folder.name}</strong>.
            </p>
            <Link href={`/carpetas/${folder.id}`} className="btn-primary">
              Sumar lugares
            </Link>
          </div>
        </div>
      )}
      {isNewUser && (
        <div className="pointer-events-none absolute inset-0 z-[600] grid place-items-center p-4">
          <div className="card pointer-events-auto flex w-full max-w-md flex-col gap-4 p-6 shadow-xl">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-stone-900">
                ¡Bienvenido a tu mapa! 👋
              </h2>
              <p className="text-sm text-stone-600">
                Así se empieza, en tres pasos:
              </p>
            </div>
            <ol className="flex flex-col gap-3 text-sm text-stone-700">
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                  1
                </span>
                Agregá un lugar que quieras conocer, o uno donde ya fuiste.
              </li>
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                  2
                </span>
                Creá una carpeta para cada grupo: tu pareja, amigos, un viaje.
              </li>
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                  3
                </span>
                Invitá a tu gente: ven solo lo que sumes a la carpeta.
              </li>
            </ol>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/lugares/nuevo" className="btn-primary flex-1">
                + Agregar un lugar
              </Link>
              <Link href="/carpetas/nueva" className="btn-secondary flex-1">
                Crear una carpeta
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
