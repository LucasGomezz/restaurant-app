"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/actions/guard";
import { CATEGORY_KEY_PREFIX, isPlaceKind, type PlaceKind } from "@/lib/places";
import { uploadPhoto, deletePhotos, imageRatio } from "@/lib/storage";

export type FormState = { error: string } | undefined;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalStr(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value.length > 0 ? value : null;
}

function file(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function files(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

/**
 * The `type` field is a built-in kind ("TRIP") or `c:<id>` for a custom
 * category, whose kind is read from the database, not trusted from the form.
 */
async function typeFromForm(
  formData: FormData,
): Promise<{ kind: PlaceKind; categoryId: number | null }> {
  const value = str(formData, "type");
  if (value.startsWith(CATEGORY_KEY_PREFIX)) {
    const id = Number(value.slice(CATEGORY_KEY_PREFIX.length));
    const category = Number.isInteger(id)
      ? await db.orm.public.Category.select("id", "baseKind")
          .where({ id })
          .first()
      : null;
    if (category) return { kind: category.baseKind, categoryId: category.id };
  }
  return { kind: isPlaceKind(value) ? value : "RESTAURANT", categoryId: null };
}

function coord(formData: FormData, key: string): number {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return NaN;
  return Number(raw);
}

// ---------- Place (restaurant, trip, event or custom type) ----------

type PlaceFields = {
  name: string;
  kind: PlaceKind;
  categoryId: number | null;
  eventDate: string | null;
  address: string | null;
  notes: string | null;
  lat: number;
  lng: number;
};

async function placeFields(
  formData: FormData,
): Promise<PlaceFields | { error: string }> {
  const name = str(formData, "name");
  const lat = coord(formData, "lat");
  const lng = coord(formData, "lng");
  const { kind, categoryId } = await typeFromForm(formData);

  if (!name) return { error: "El nombre es obligatorio." };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "Elegí una ubicación en el mapa." };
  }

  return {
    name,
    kind,
    categoryId,
    eventDate: kind === "EVENT" ? optionalStr(formData, "eventDate") : null,
    address: optionalStr(formData, "address"),
    notes: optionalStr(formData, "notes"),
    lat,
    lng,
  };
}

export async function createRestaurant(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const fields = await placeFields(formData);
  if ("error" in fields) return fields;

  const restaurant = await db.orm.public.Restaurant.create({
    ...fields,
    status: "PENDING",
  });

  redirect(`/lugares/${restaurant.id}`);
}

export async function updateRestaurant(
  id: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const fields = await placeFields(formData);
  if ("error" in fields) return fields;

  await db.orm.public.Restaurant.where({ id }).update(fields);

  redirect(`/lugares/${id}`);
}

export async function deleteRestaurant(id: number) {
  await requireUser();

  const restaurant = await db.orm.public.Restaurant.where({ id })
    .include("visit", (v) => v.include("dishes").include("photos"))
    .first();

  const paths = [
    restaurant?.visit?.coupleImageUrl ?? null,
    restaurant?.visit?.placeImageUrl ?? null,
    ...(restaurant?.visit?.dishes.map((dish) => dish.imageUrl) ?? []),
    ...(restaurant?.visit?.photos.map((photo) => photo.path) ?? []),
  ];

  await db.orm.public.Restaurant.where({ id }).delete();
  await deletePhotos(paths);

  redirect("/pendientes");
}

// ---------- Visit (mark as visited) ----------

export async function markVisited(
  restaurantId: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const visitDate = str(formData, "visitDate");
  const endDate = optionalStr(formData, "endDate");
  const description = str(formData, "description");

  if (!visitDate) return { error: "Elegí la fecha de la visita." };
  if (endDate && endDate < visitDate) {
    return { error: "La vuelta no puede ser antes de la ida." };
  }
  if (!description) return { error: "Contanos cómo fue la experiencia." };

  const dishNames = formData.getAll("dishName").map((v) => String(v).trim());
  const dishDescriptions = formData
    .getAll("dishDescription")
    .map((v) => String(v).trim());
  const dishImages = formData.getAll("dishImage");

  const coupleImage = file(formData, "coupleImage");
  const coupleImageUrl = coupleImage
    ? await uploadPhoto(coupleImage, `visits/${restaurantId}`)
    : null;

  const placeImage = file(formData, "placeImage");
  const placeImageUrl = placeImage
    ? await uploadPhoto(placeImage, `places/${restaurantId}`)
    : null;

  const coupleImageRatio = coupleImage ? await imageRatio(coupleImage) : null;
  const placeImageRatio = placeImage ? await imageRatio(placeImage) : null;

  const dishes: {
    name: string;
    description: string | null;
    imageUrl: string | null;
  }[] = [];
  for (let i = 0; i < dishNames.length; i++) {
    const name = dishNames[i];
    if (!name) continue;
    const imageEntry = dishImages[i];
    const imagePath =
      imageEntry instanceof File && imageEntry.size > 0
        ? await uploadPhoto(imageEntry, `dishes/${restaurantId}`)
        : null;
    dishes.push({
      name,
      description: dishDescriptions[i] || null,
      imageUrl: imagePath,
    });
  }

  const photoPaths = await uploadAll(files(formData, "photos"), restaurantId);

  await db.transaction(async (tx) => {
    await tx.orm.public.Restaurant.where({ id: restaurantId }).update({
      status: "VISITED",
    });

    const visit = await tx.orm.public.Visit.create({
      restaurantId,
      visitDate,
      endDate,
      description,
      coupleImageUrl,
      coupleImageRatio,
      placeImageUrl,
      placeImageRatio,
    });

    if (dishes.length > 0) {
      await tx.orm.public.Dish.createAll(
        dishes.map((dish) => ({ ...dish, visitId: visit.id })),
      );
    }

    if (photoPaths.length > 0) {
      await tx.orm.public.Photo.createAll(
        photoPaths.map((path, position) => ({
          visitId: visit.id,
          path,
          position,
        })),
      );
    }
  });

  redirect(`/lugares/${restaurantId}`);
}

export async function updateVisit(
  visitId: number,
  restaurantId: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const visitDate = str(formData, "visitDate");
  const endDate = optionalStr(formData, "endDate");
  const description = str(formData, "description");

  if (!visitDate) return { error: "Elegí la fecha de la visita." };
  if (endDate && endDate < visitDate) {
    return { error: "La vuelta no puede ser antes de la ida." };
  }
  if (!description) return { error: "Contanos cómo fue la experiencia." };

  const newCoverImage = file(formData, "coupleImage");
  const newPlaceImage = file(formData, "placeImage");

  let coupleImageUrl: string | null | undefined = undefined;
  let placeImageUrl: string | null | undefined = undefined;
  let coupleImageRatio: number | null = null;
  let placeImageRatio: number | null = null;
  const replacedPaths: (string | null)[] = [];

  if (newCoverImage || newPlaceImage) {
    const existing = await db.orm.public.Visit.select(
      "coupleImageUrl",
      "placeImageUrl",
    )
      .where({ id: visitId })
      .first();
    if (newCoverImage) {
      replacedPaths.push(existing?.coupleImageUrl ?? null);
      coupleImageUrl = await uploadPhoto(
        newCoverImage,
        `visits/${restaurantId}`,
      );
      coupleImageRatio = await imageRatio(newCoverImage);
    }
    if (newPlaceImage) {
      replacedPaths.push(existing?.placeImageUrl ?? null);
      placeImageUrl = await uploadPhoto(
        newPlaceImage,
        `places/${restaurantId}`,
      );
      placeImageRatio = await imageRatio(newPlaceImage);
    }
  }

  await db.orm.public.Visit.where({ id: visitId }).update({
    visitDate,
    endDate,
    description,
    ...(coupleImageUrl !== undefined
      ? { coupleImageUrl, coupleImageRatio }
      : {}),
    ...(placeImageUrl !== undefined ? { placeImageUrl, placeImageRatio } : {}),
  });

  await deletePhotos(replacedPaths);

  revalidatePath(`/lugares/${restaurantId}`);
}

// ---------- Carousel photos ----------

async function uploadAll(photos: File[], restaurantId: number) {
  const paths: string[] = [];
  for (const photo of photos) {
    paths.push(await uploadPhoto(photo, `gallery/${restaurantId}`));
  }
  return paths;
}

export async function addPhotos(
  visitId: number,
  restaurantId: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const photos = files(formData, "photos");
  if (photos.length === 0) return { error: "Elegí al menos una foto." };

  const last = await db.orm.public.Photo.select("position")
    .where({ visitId })
    .orderBy((row) => row.position.desc())
    .first();
  const start = (last?.position ?? -1) + 1;

  const paths = await uploadAll(photos, restaurantId);
  await db.orm.public.Photo.createAll(
    paths.map((path, index) => ({ visitId, path, position: start + index })),
  );

  revalidatePath(`/lugares/${restaurantId}`);
}

export async function deletePhoto(restaurantId: number, photoId: number) {
  await requireUser();

  const photo = await db.orm.public.Photo.select("path")
    .where({ id: photoId })
    .first();
  if (!photo) return;

  await db.orm.public.Photo.where({ id: photoId }).delete();
  await deletePhotos([photo.path]);

  revalidatePath(`/lugares/${restaurantId}`);
}

// ---------- Dishes ----------

export async function addDish(
  visitId: number,
  restaurantId: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const name = str(formData, "name");
  if (!name) return { error: "El plato necesita un nombre." };

  const image = file(formData, "image");
  const imageUrl = image
    ? await uploadPhoto(image, `dishes/${restaurantId}`)
    : null;

  await db.orm.public.Dish.create({
    visitId,
    name,
    description: optionalStr(formData, "description"),
    imageUrl,
  });

  revalidatePath(`/lugares/${restaurantId}`);
}

export async function updateDish(
  dishId: number,
  restaurantId: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const name = str(formData, "name");
  if (!name) return { error: "El plato necesita un nombre." };

  const newImage = file(formData, "image");
  let imageUrl: string | null | undefined = undefined;
  let oldImageUrl: string | null = null;

  if (newImage) {
    const existing = await db.orm.public.Dish.select("imageUrl")
      .where({ id: dishId })
      .first();
    oldImageUrl = existing?.imageUrl ?? null;
    imageUrl = await uploadPhoto(newImage, `dishes/${restaurantId}`);
  }

  await db.orm.public.Dish.where({ id: dishId }).update({
    name,
    description: optionalStr(formData, "description"),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
  });

  if (oldImageUrl) {
    await deletePhotos([oldImageUrl]);
  }

  revalidatePath(`/lugares/${restaurantId}`);
}

export async function deleteDish(dishId: number, restaurantId: number) {
  await requireUser();

  const dish = await db.orm.public.Dish.select("imageUrl")
    .where({ id: dishId })
    .first();

  await db.orm.public.Dish.where({ id: dishId }).delete();

  if (dish?.imageUrl) {
    await deletePhotos([dish.imageUrl]);
  }

  revalidatePath(`/lugares/${restaurantId}`);
}
