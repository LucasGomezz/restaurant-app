import { PageHeader } from "@/components/PageHeader";
import { PlaceForm } from "@/components/PlaceForm";
import { createRestaurant } from "@/lib/actions/restaurants";
import { kindFromSlug } from "@/lib/places";

export default async function NuevoLugarPage(
  props: PageProps<"/lugares/nuevo">,
) {
  const { tipo } = await props.searchParams;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Agregar"
        description="Un restaurante, viaje o evento para la lista de pendientes."
        backHref="/pendientes"
        backLabel="Pendientes"
      />
      <div className="card p-5 sm:p-6">
        <PlaceForm
          action={createRestaurant}
          initialKind={kindFromSlug(tipo)}
          submitLabel="Agregar"
          cancelHref="/pendientes"
        />
      </div>
    </div>
  );
}
