import { PageHeader } from "@/components/PageHeader";
import { PlaceForm } from "@/components/PlaceForm";
import { createRestaurant } from "@/lib/actions/restaurants";
import { typeFromSlug } from "@/lib/places";
import { getFormPlaceTypes } from "@/lib/queries/categories";
import { getFolderDetail } from "@/lib/queries/folders";
import { getKnownLocations } from "@/lib/queries/restaurants";

export default async function NuevoLugarPage(
  props: PageProps<"/lugares/nuevo">,
) {
  const { tipo, carpeta } = await props.searchParams;
  const [types, knownLocations, folder] = await Promise.all([
    getFormPlaceTypes(),
    getKnownLocations(),
    typeof carpeta === "string" ? getFolderDetail(carpeta) : null,
  ]);
  // Coming from a folder the user can add to: the place goes straight into it.
  const target = folder && folder.role !== "VIEWER" ? folder.folder : null;
  const backHref = target ? `/carpetas/${target.id}` : "/pendientes";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Agregar"
        description={
          target
            ? `Se suma a la carpeta ${target.icon} ${target.name}.`
            : "Un restaurante, viaje, evento o lo que quieran para la lista de pendientes."
        }
        backHref={backHref}
        backLabel={target ? target.name : "Pendientes"}
      />
      <div className="card p-5 sm:p-6">
        <PlaceForm
          action={createRestaurant}
          types={types}
          knownLocations={knownLocations}
          initialType={typeFromSlug(types, tipo)}
          submitLabel="Agregar"
          cancelHref={backHref}
          folderId={target?.id}
        />
      </div>
    </div>
  );
}
