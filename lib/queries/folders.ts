import "server-only";
import { db } from "@/lib/db";
import { hasRole, isUuid, membershipsOf, roleIn } from "@/lib/access";
import { requireProfile } from "@/lib/auth/session";

// Folder reads. Like the place queries, each one reads the signed-in user
// itself and only returns folders they belong to (see lib/access.ts).

const FOLDER_FIELDS = [
  "id",
  "name",
  "description",
  "icon",
  "startDate",
  "endDate",
] as const;

/** The user's folders, newest first, with their role and a few counts. */
export async function getMyFolders() {
  const { user } = await requireProfile();
  const memberships = await membershipsOf(user.id);
  if (memberships.length === 0) return [];

  const folders = await db.orm.public.Folder.select(...FOLDER_FIELDS, "createdAt")
    .where((f) => f.id.in(memberships.map((m) => m.folderId)))
    .include("members", (m) => m.select("userId"))
    .include("places", (p) => p.select("placeId"))
    .orderBy((f) => f.createdAt.desc())
    .all();

  return folders.map(({ members, places, ...folder }) => ({
    ...folder,
    role: memberships.find((m) => m.folderId === folder.id)!.role,
    memberCount: members.length,
    placeCount: places.length,
  }));
}

/** A folder the user belongs to, with its members; null otherwise. */
export async function getFolderDetail(folderId: string) {
  const { user } = await requireProfile();
  const role = await roleIn(user.id, folderId);
  if (!role) return null;

  const folder = await db.orm.public.Folder.select(...FOLDER_FIELDS)
    .where({ id: folderId })
    .include("members", (m) =>
      m
        .select("userId", "role", "joinedAt")
        .include("user", (u) => u.select("username", "displayName"))
        .orderBy((row) => row.joinedAt.asc()),
    )
    .first();
  if (!folder) return null;

  // Only the owner manages the join link.
  const invite =
    role === "OWNER"
      ? await db.orm.public.FolderInvite.select("id", "role", "expiresAt")
          .where({ folderId })
          .where((i) => i.expiresAt.gt(new Date().toISOString()))
          .orderBy((i) => i.createdAt.desc())
          .first()
      : null;

  return { folder, role, invite, me: user.id };
}

/** The user's own places that aren't in the folder yet, to add them. */
export async function getPlacesToAdd(folderId: string) {
  const { user } = await requireProfile();
  if (!hasRole(await roleIn(user.id, folderId), "EDITOR")) return [];

  return db.orm.public.Restaurant.select("id", "name")
    .where({ ownerId: user.id })
    .where((r) => r.folders.none((link) => link.folderId.eq(folderId)))
    .orderBy((r) => r.name.asc())
    .all();
}

/**
 * The folders a place is in (among the user's), and — for the place's
 * owner — the folders they could still add it to.
 */
export async function getPlaceFolders(placeId: number, isOwner: boolean) {
  const { user } = await requireProfile();
  const memberships = await membershipsOf(user.id);
  if (memberships.length === 0) return { inFolders: [], canAddTo: [] };

  const folders = await db.orm.public.Folder.select("id", "name", "icon")
    .where((f) => f.id.in(memberships.map((m) => m.folderId)))
    .include("places", (p) => p.select("placeId").where({ placeId }))
    .orderBy((f) => f.name.asc())
    .all();

  const roleOf = (id: string) =>
    memberships.find((m) => m.folderId === id)!.role;
  const inFolders = folders
    .filter((f) => f.places.length > 0)
    .map(({ id, name, icon }) => ({
      id,
      name,
      icon,
      // The place's owner, or the folder's owner, may take it out.
      canRemove: isOwner || roleOf(id) === "OWNER",
    }));
  const canAddTo = isOwner
    ? folders
        .filter((f) => f.places.length === 0 && hasRole(roleOf(f.id), "EDITOR"))
        .map(({ id, name, icon }) => ({ id, name, icon }))
    : [];

  return { inFolders, canAddTo };
}

/** What the join page shows; null when the link doesn't exist or expired. */
export async function getInvite(inviteId: string) {
  if (!isUuid(inviteId)) return null;
  const { user } = await requireProfile();

  const invite = await db.orm.public.FolderInvite.select(
    "id",
    "folderId",
    "role",
    "expiresAt",
  )
    .where({ id: inviteId })
    .where((i) => i.expiresAt.gt(new Date().toISOString()))
    .first();
  if (!invite) return null;

  const folder = await db.orm.public.Folder.select("id", "name", "icon")
    .where({ id: invite.folderId })
    .include("members", (m) =>
      m
        .select("userId", "role")
        .include("user", (u) => u.select("displayName")),
    )
    .first();
  if (!folder) return null;

  const owner = folder.members.find((m) => m.role === "OWNER");
  return {
    invite,
    folder: { id: folder.id, name: folder.name, icon: folder.icon },
    memberCount: folder.members.length,
    ownerName: owner?.user?.displayName ?? null,
    alreadyMember: folder.members.some((m) => m.userId === user.id),
  };
}
