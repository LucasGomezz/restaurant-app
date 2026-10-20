"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  assertCanEditDish,
  assertCanEditPhoto,
  assertCanEditPlace,
  assertCanEditVisit,
  categoriesOf,
} from "@/lib/access";
import { requireUser } from "@/lib/actions/guard";
import { CATEGORY_KEY_PREFIX, isPlaceKind, type PlaceKind } from "@/lib/places";
import { uploadPhoto, deletePhotos, imageRatio } from "@/lib/storage";

// Ids bound into these actions come from the browser and can be forged:
// every action checks access through lib/access.ts, which resolves the place
// from the most specific id instead of trusting a place id sent along.

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

/** Storage folder for a user's uploads of one kind, e.g. `u/<id>/dishes`. */
function folder(userId: string, kind: "visits" | "places" | "dishes" | "gallery") {
  return `u/${userId}/${kind}`;
}

/**
 * The `type` field is a built-in kind ("TRIP") or `c:<id>` for a custom
 * category, whose kind is read from the database, not trusted from the form.
 * Only the user's own categories are accepted.
 */
async function typeFromForm(
  userId: string,
  formData: FormData,
): Promise<{ kind: PlaceKind; categoryId: number | null }> {
  const value = str(formData, "type");
  if (value.startsWith(CATEGORY_KEY_PREFIX)) {
    const id = Number(value.slice(CATEGORY_KEY_PREFIX.length));
    const category = Number.isInteger(id)
      ? await db.orm.public.Category.select("id", "baseKind")
          .where({ id, ...categoriesOf(userId) })
          .first()
      : null;
    if (category) return { kind: category.baseKind, categoryId: category.id };
  }
  return { kind: isPlaceKind(value) ? value : "RESTAURANT", categoryId: null };
}

/** Refreshes a place page and the visit pages under it. */
function refreshPlace(restaurantId: number) {
  revalidatePath(`/lugares/${restaurantId}`, "layout");
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
  userId: string,
  formData: FormData,
): Promise<PlaceFields | { error: string }> {
  const name = str(formData, "name");
  const lat = coord(formData, "lat");
  const lng = coord(formData, "lng");
  const { kind, categoryId } = await typeFromForm(userId, formData);

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
  const { user } = await requireUser();

  const fields = await placeFields(user.id, formData);
  if ("error" in fields) return fields;

  const restaurant = await db.orm.public.Restaurant.create({
    ...fields,
    ownerId: user.id,
    status: "PENDING",
  });

  redirect(`/lugares/${restaurant.id}`);
}

export async function updateRestaurant(
  id: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireUser();
  const { placeId } = await assertCanEditPlace(user.id, id);

  const fields = await placeFields(user.id, formData);
  if ("error" in fields) return fields;

  await db.orm.public.Restaurant.where({ id: placeId }).update(fields);

  redirect(`/lugares/${placeId}`);
}

export async function deleteRestaurant(id: number) {
  const { user } = await requireUser();
  const { placeId } = await assertCanEditPlace(user.id, id);

  const restaurant = await db.orm.public.Restaurant.where({ id: placeId })
    .include("visits", (v) => v.include("dishes").include("photos"))
    .first();

  const paths = restaurant?.visits.flatMap(visitPhotoPaths) ?? [];

  await db.orm.public.Restaurant.where({ id: placeId }).delete();
  await deletePhotos(paths);

  redirect("/pendientes");
}

/** Every stored file of a visit: cover, place, dishes and carousel. */
function visitPhotoPaths(visit: {
  coupleImageUrl: string | null;
  placeImageUrl: string | null;
  dishes: { imageUrl: string | null }[];
  photos: { path: string }[];
}) {
  return [
    visit.coupleImageUrl,
    visit.placeImageUrl,
    ...visit.dishes.map((dish) => dish.imageUrl),
    ...visit.photos.map((photo) => photo.path),
  ];
}

// ---------- Visits (a place can be visited many times) ----------

/** Adds a visit: the first one marks the place as visited. */
export async function addVisit(
  restaurantId: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireUser();
  const { placeId } = await assertCanEditPlace(user.id, restaurantId);

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
    ? await uploadPhoto(coupleImage, folder(user.id, "visits"))
    : null;

  const placeImage = file(formData, "placeImage");
  const placeImageUrl = placeImage
    ? await uploadPhoto(placeImage, folder(user.id, "places"))
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
        ? await uploadPhoto(imageEntry, folder(user.id, "dishes"))
        : null;
    dishes.push({
      name,
      description: dishDescriptions[i] || null,
      imageUrl: imagePath,
    });
  }

  const photoPaths = await uploadAll(files(formData, "photos"), user.id);

  await db.transaction(async (tx) => {
    await tx.orm.public.Restaurant.where({ id: placeId }).update({
      status: "VISITED",
    });

    const visit = await tx.orm.public.Visit.create({
      restaurantId: placeId,
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

  redirect(`/lugares/${placeId}`);
}

/** Removes a visit and its photos; with none left, the place is pending again. */
export async function deleteVisit(id: number) {
  const { user } = await requireUser();
  const { visitId, placeId } = await assertCanEditVisit(user.id, id);

  const visit = await db.orm.public.Visit.where({ id: visitId })
    .include("dishes")
    .include("photos")
    .first();
  if (!visit) return;

  await db.transaction(async (tx) => {
    await tx.orm.public.Visit.where({ id: visitId }).delete();
    const remaining = await tx.orm.public.Visit.select("id")
      .where({ restaurantId: placeId })
      .first();
    if (!remaining) {
      await tx.orm.public.Restaurant.where({ id: placeId }).update({
        status: "PENDING",
      });
    }
  });
  await deletePhotos(visitPhotoPaths(visit));

  // Its own page is gone, so always land on the place.
  redirect(`/lugares/${placeId}`);
}

export async function updateVisit(
  id: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireUser();
  const { visitId, placeId } = await assertCanEditVisit(user.id, id);

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
        folder(user.id, "visits"),
      );
      coupleImageRatio = await imageRatio(newCoverImage);
    }
    if (newPlaceImage) {
      replacedPaths.push(existing?.placeImageUrl ?? null);
      placeImageUrl = await uploadPhoto(
        newPlaceImage,
        folder(user.id, "places"),
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

  refreshPlace(placeId);
}

// ---------- Carousel photos ----------

async function uploadAll(photos: File[], userId: string) {
  const paths: string[] = [];
  for (const photo of photos) {
    paths.push(await uploadPhoto(photo, folder(userId, "gallery")));
  }
  return paths;
}

export async function addPhotos(
  id: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireUser();
  const { visitId, placeId } = await assertCanEditVisit(user.id, id);

  const photos = files(formData, "photos");
  if (photos.length === 0) return { error: "Elegí al menos una foto." };

  const last = await db.orm.public.Photo.select("position")
    .where({ visitId })
    .orderBy((row) => row.position.desc())
    .first();
  const start = (last?.position ?? -1) + 1;

  const paths = await uploadAll(photos, user.id);
  await db.orm.public.Photo.createAll(
    paths.map((path, index) => ({ visitId, path, position: start + index })),
  );

  refreshPlace(placeId);
}

export async function deletePhoto(id: number) {
  const { user } = await requireUser();
  const { photoId, placeId } = await assertCanEditPhoto(user.id, id);

  const photo = await db.orm.public.Photo.select("path")
    .where({ id: photoId })
    .first();
  if (!photo) return;

  await db.orm.public.Photo.where({ id: photoId }).delete();
  await deletePhotos([photo.path]);

  refreshPlace(placeId);
}

// ---------- Dishes ----------

export async function addDish(
  id: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireUser();
  const { visitId, placeId } = await assertCanEditVisit(user.id, id);

  const name = str(formData, "name");
  if (!name) return { error: "El plato necesita un nombre." };

  const image = file(formData, "image");
  const imageUrl = image
    ? await uploadPhoto(image, folder(user.id, "dishes"))
    : null;

  await db.orm.public.Dish.create({
    visitId,
    name,
    description: optionalStr(formData, "description"),
    imageUrl,
  });

  refreshPlace(placeId);
}

export async function updateDish(
  id: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireUser();
  const { dishId, placeId } = await assertCanEditDish(user.id, id);

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
    imageUrl = await uploadPhoto(newImage, folder(user.id, "dishes"));
  }

  await db.orm.public.Dish.where({ id: dishId }).update({
    name,
    description: optionalStr(formData, "description"),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
  });

  if (oldImageUrl) {
    await deletePhotos([oldImageUrl]);
  }

  refreshPlace(placeId);
}

export async function deleteDish(id: number) {
  const { user } = await requireUser();
  const { dishId, placeId } = await assertCanEditDish(user.id, id);

  const dish = await db.orm.public.Dish.select("imageUrl")
    .where({ id: dishId })
    .first();

  await db.orm.public.Dish.where({ id: dishId }).delete();

  if (dish?.imageUrl) {
    await deletePhotos([dish.imageUrl]);
  }

  refreshPlace(placeId);
}
