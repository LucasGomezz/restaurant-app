import { PageHeader } from "@/components/PageHeader";
import { PlaceForm } from "@/components/PlaceForm";
import { createRestaurant } from "@/lib/actions/restaurants";
import { typeFromSlug } from "@/lib/places";
import { getPlaceTypes } from "@/lib/queries/categories";
import { getKnownLocations } from "@/lib/queries/restaurants";

export default async function NuevoLugarPage(
  props: PageProps<"/lugares/nuevo">,
) {
  const { tipo } = await props.searchParams;
  const [types, knownLocations] = await Promise.all([
    getPlaceTypes(),
    getKnownLocations(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Agregar"
        description="Un restaurante, viaje, evento o lo que quieran para la lista de pendientes."
        backHref="/pendientes"
        backLabel="Pendientes"
      />
      <div className="card p-5 sm:p-6">
        <PlaceForm
          action={createRestaurant}
          types={types}
          knownLocations={knownLocations}
          initialType={typeFromSlug(types, tipo)}
          submitLabel="Agregar"
          cancelHref="/pendientes"
        />
      </div>
    </div>
  );
}
