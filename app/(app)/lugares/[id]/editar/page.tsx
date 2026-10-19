import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PlaceForm } from "@/components/PlaceForm";
import { updateRestaurant } from "@/lib/actions/restaurants";
import { db } from "@/lib/db";
import { getPlaceTypes } from "@/lib/queries/categories";
import { getKnownLocations } from "@/lib/queries/restaurants";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditarRestaurantePage({ params }: Props) {
  const { id } = await params;
  const restaurantId = Number(id);
  if (!Number.isInteger(restaurantId)) notFound();

  const [restaurant, types, knownLocations] = await Promise.all([
    db.orm.public.Restaurant.select(
      "id",
      "name",
      "address",
      "notes",
      "kind",
      "categoryId",
      "eventDate",
      "lat",
      "lng",
    )
      .where({ id: restaurantId })
      .first(),
    getPlaceTypes(),
    getKnownLocations(),
  ]);

  if (!restaurant) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Editar"
        backHref={`/lugares/${restaurantId}`}
        backLabel={restaurant.name}
      />
      <div className="card p-5 sm:p-6">
        <PlaceForm
          action={updateRestaurant.bind(null, restaurantId)}
          defaultValues={restaurant}
          types={types}
          knownLocations={knownLocations}
          submitLabel="Guardar cambios"
          cancelHref={`/lugares/${restaurantId}`}
        />
      </div>
    </div>
  );
}
