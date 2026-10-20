import "server-only";
import { cache } from "react";
import { or } from "@prisma/orm-postgres/orm-client";
import { db } from "@/lib/db";

/**
 * Who may see and change what. Every read and write of user data goes
 * through here, so the rules live in one place (docs/arquitectura.md):
 *
 * - A place belongs to whoever created it. They see it, edit it, delete it,
 *   and are the only one who can add it to folders.
 * - Members of a folder see every place in it. EDITOR and OWNER members can
 *   also edit those places (data, visits, photos, dishes), but not delete
 *   them; VIEWER members only look.
 * - Only a folder's OWNER renames it, invites, manages members and deletes
 *   it. Removing a place from a folder: the place's owner or the folder OWNER.
 * - A custom category belongs to whoever created it.
 * - Ownerless rows (from before accounts existed) are visible to nobody.
 * - Being friends gives access to nothing.
 *
 * The ids that Server Actions receive come from the browser and can be
 * forged, so the `assert*` helpers resolve everything from the database,
 * starting at the most specific id, and never trust a parent id sent along.
 */

export type FolderRole = "OWNER" | "EDITOR" | "VIEWER";

const RANK: Record<FolderRole, number> = { VIEWER: 1, EDITOR: 2, OWNER: 3 };

export function hasRole(role: FolderRole | null, atLeast: FolderRole) {
  return role !== null && RANK[role] >= RANK[atLeast];
}

export class AccessDeniedError extends Error {
  constructor() {
    super("Not found");
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Folder and invite ids come from URLs; anything else can't exist. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

// ---------- Folders ----------

/** The user's folders with their role in each. Memoized per render. */
export const membershipsOf = cache(async (userId: string) => {
  return db.orm.public.FolderMember.select("folderId", "role")
    .where({ userId })
    .all();
});

async function folderIdsWhere(userId: string, atLeast: FolderRole) {
  const memberships = await membershipsOf(userId);
  return memberships
    .filter((m) => hasRole(m.role, atLeast))
    .map((m) => m.folderId);
}

/** The user's role in a folder, or null when they aren't a member. */
export async function roleIn(
  userId: string,
  folderId: string,
): Promise<FolderRole | null> {
  if (!isUuid(folderId)) return null;
  const membership = (await membershipsOf(userId)).find(
    (m) => m.folderId === folderId,
  );
  return membership?.role ?? null;
}

export async function assertFolderRole(
  userId: string,
  folderId: string,
  atLeast: FolderRole,
) {
  const role = await roleIn(userId, folderId);
  if (!hasRole(role, atLeast)) throw new AccessDeniedError();
  return { folderId, role: role! };
}

// ---------- Places ----------

type PlaceQuery = ReturnType<typeof db.orm.public.Restaurant.where>;

/**
 * A `Restaurant` query narrowed to the places the user may see: their own
 * and those in any folder they belong to. Chain further filters onto it.
 */
export async function visiblePlacesQuery(userId: string): Promise<PlaceQuery> {
  const folderIds = await folderIdsWhere(userId, "VIEWER");
  if (folderIds.length === 0) {
    return db.orm.public.Restaurant.where({ ownerId: userId });
  }
  return db.orm.public.Restaurant.where((r) =>
    or(
      r.ownerId.eq(userId),
      r.folders.some((link) => link.folderId.in(folderIds)),
    ),
  );
}

/** Narrows a `Restaurant` query to the places of one folder. */
export function inFolder(query: PlaceQuery, folderId: string): PlaceQuery {
  return query.where((r) => r.folders.some((link) => link.folderId.eq(folderId)));
}

/** What the user may do with a place they can see. */
export type PlacePermissions = { canEdit: boolean; isOwner: boolean };

export async function placePermissions(
  userId: string,
  place: { id: number; ownerId: string | null },
): Promise<PlacePermissions> {
  if (place.ownerId === userId) return { canEdit: true, isOwner: true };
  const editable = await folderIdsWhere(userId, "EDITOR");
  if (editable.length === 0) return { canEdit: false, isOwner: false };
  const link = await db.orm.public.FolderPlace.select("id")
    .where({ placeId: place.id })
    .where((l) => l.folderId.in(editable))
    .first();
  return { canEdit: Boolean(link), isOwner: false };
}

/** The place, if the user may edit it; throws otherwise. */
export async function assertCanEditPlace(userId: string, placeId: number) {
  const place = await db.orm.public.Restaurant.select("id", "ownerId")
    .where({ id: placeId })
    .first();
  if (!place || !(await placePermissions(userId, place)).canEdit) {
    throw new AccessDeniedError();
  }
  return { placeId: place.id };
}

/** Deleting a place, and sharing it into folders, is for its owner only. */
export async function assertOwnsPlace(userId: string, placeId: number) {
  const place = await db.orm.public.Restaurant.select("id")
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

// ---------- Categories ----------

/** Filter for `Category`: the user's own types. */
export function categoriesOf(userId: string) {
  return { ownerId: userId };
}

/** The category, if it belongs to the user. */
export async function assertCanEditCategory(userId: string, categoryId: number) {
  const category = await db.orm.public.Category.select("id")
    .where({ id: categoryId, ownerId: userId })
    .first();
  if (!category) throw new AccessDeniedError();
  return { categoryId: category.id };
}
