import "server-only";
import { db } from "@/lib/db";

/**
 * Who may see and change what. Every read and write of user data goes
 * through here, so the rules live in one place:
 *
 * - A place (and its visits, dishes and photos) belongs to whoever created it.
 * - A custom category belongs to whoever created it.
 * - Ownerless rows (from before accounts existed) are visible to nobody.
 *
 * Shared folders (docs/arquitectura.md, Fase 2) will widen `placesVisibleTo`
 * and the edit checks; callers won't need to change.
 *
 * The ids that Server Actions receive come from the browser and can be
 * forged, so the `assert*` helpers resolve ownership from the database,
 * starting at the most specific id, and never trust the parent id sent along.
 */

export class AccessDeniedError extends Error {
  constructor() {
    super("Not found");
  }
}

/** Filter for queries on `Restaurant`: the places the user may see. */
export function placesVisibleTo(userId: string) {
  return { ownerId: userId };
}

/** Filter for queries on `Category`: the user's own types. */
export function categoriesOf(userId: string) {
  return { ownerId: userId };
}

/** The place, if the user may edit it; throws otherwise. */
export async function assertCanEditPlace(userId: string, placeId: number) {
  const place = await db.orm.public.Restaurant.select("id", "ownerId")
    .where({ id: placeId, ownerId: userId })
    .first();
  if (!place) throw new AccessDeniedError();
  return { placeId: place.id };
}

/** The visit and its place, if the user may edit the place. */
export async function assertCanEditVisit(userId: string, visitId: number) {
  const visit = await db.orm.public.Visit.select("id", "restaurantId")
    .where({ id: visitId })
    .first();
  if (!visit) throw new AccessDeniedError();
  await assertCanEditPlace(userId, visit.restaurantId);
  return { visitId: visit.id, placeId: visit.restaurantId };
}

/** The dish and its place, if the user may edit the place. */
export async function assertCanEditDish(userId: string, dishId: number) {
  const dish = await db.orm.public.Dish.select("id", "visitId")
    .where({ id: dishId })
    .first();
  if (!dish) throw new AccessDeniedError();
  const { placeId } = await assertCanEditVisit(userId, dish.visitId);
  return { dishId: dish.id, visitId: dish.visitId, placeId };
}

/** The photo and its place, if the user may edit the place. */
export async function assertCanEditPhoto(userId: string, photoId: number) {
  const photo = await db.orm.public.Photo.select("id", "visitId")
    .where({ id: photoId })
    .first();
  if (!photo) throw new AccessDeniedError();
  const { placeId } = await assertCanEditVisit(userId, photo.visitId);
  return { photoId: photo.id, visitId: photo.visitId, placeId };
}

/** The category, if it belongs to the user. */
export async function assertCanEditCategory(userId: string, categoryId: number) {
  const category = await db.orm.public.Category.select("id")
    .where({ id: categoryId, ownerId: userId })
    .first();
  if (!category) throw new AccessDeniedError();
  return { categoryId: category.id };
}
