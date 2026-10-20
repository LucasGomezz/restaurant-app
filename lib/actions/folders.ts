"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  AccessDeniedError,
  assertFolderRole,
  assertOwnsPlace,
  isUuid,
  roleIn,
  type FolderRole,
} from "@/lib/access";
import { requireUser } from "@/lib/actions/guard";
import { graphemeCount } from "@/lib/format";

// Every action checks the caller's role through lib/access.ts: folder and
// user ids arrive from the browser and can be forged.

export type FolderFormState = { error: string } | undefined;

/** How long a join link works. */
const INVITE_DAYS = 7;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalStr(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value.length > 0 ? value : null;
}

type FolderFields = {
  name: string;
  description: string | null;
  icon: string;
  startDate: string | null;
  endDate: string | null;
};

function folderFields(formData: FormData): FolderFields | { error: string } {
  const name = str(formData, "name").replace(/\s+/g, " ");
  const icon = str(formData, "icon") || "📁";
  const startDate = optionalStr(formData, "startDate");
  const endDate = optionalStr(formData, "endDate");

  if (!name) return { error: "Poné un nombre." };
  if (name.length > 60) return { error: "El nombre es muy largo." };
  if (graphemeCount(icon) > 1) return { error: "Usá un solo emoji." };
  if (endDate && !startDate) {
    return { error: "Si tiene vuelta, poné también la fecha de ida." };
  }
  if (startDate && endDate && endDate < startDate) {
    return { error: "La vuelta no puede ser antes de la ida." };
  }

  return {
    name,
    icon,
    description: optionalStr(formData, "description"),
    startDate,
    endDate,
  };
}

function refreshFolder(folderId: string) {
  revalidatePath(`/carpetas/${folderId}`, "layout");
}

/** The sidebar lists the user's folders: refresh it when that list changes. */
function refreshSidebar() {
  revalidatePath("/", "layout");
}

// ---------- Folders ----------

export async function createFolder(
  _prevState: FolderFormState,
  formData: FormData,
): Promise<FolderFormState> {
  const { user } = await requireUser();

  const fields = folderFields(formData);
  if ("error" in fields) return fields;

  const folderId = await db.transaction(async (tx) => {
    const folder = await tx.orm.public.Folder.create(fields);
    await tx.orm.public.FolderMember.create({
      folderId: folder.id,
      userId: user.id,
      role: "OWNER",
    });
    return folder.id;
  });

  refreshSidebar();
  redirect(`/carpetas/${folderId}`);
}

export async function updateFolder(
  id: string,
  _prevState: FolderFormState,
  formData: FormData,
): Promise<FolderFormState> {
  const { user } = await requireUser();
  const { folderId } = await assertFolderRole(user.id, id, "OWNER");

  const fields = folderFields(formData);
  if ("error" in fields) return fields;

  await db.orm.public.Folder.where({ id: folderId }).update(fields);

  refreshSidebar();
  redirect(`/carpetas/${folderId}`);
}

/** The places stay with their owners; only the folder and its links go. */
export async function deleteFolder(id: string) {
  const { user } = await requireUser();
  const { folderId } = await assertFolderRole(user.id, id, "OWNER");

  await db.orm.public.Folder.where({ id: folderId }).delete();

  refreshSidebar();
  redirect("/carpetas");
}

// ---------- Members ----------

function isGuestRole(value: unknown): value is "EDITOR" | "VIEWER" {
  return value === "EDITOR" || value === "VIEWER";
}

/** Replaces the folder's join link with a fresh one for the given role. */
export async function createInvite(id: string, role: FolderRole) {
  const { user } = await requireUser();
  const { folderId } = await assertFolderRole(user.id, id, "OWNER");
  if (!isGuestRole(role)) throw new AccessDeniedError();

  const expiresAt = new Date(
    Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  await db.transaction(async (tx) => {
    await tx.orm.public.FolderInvite.where({ folderId }).delete();
    await tx.orm.public.FolderInvite.create({
      // The id is the secret in the link: generate it here, explicitly random.
      id: crypto.randomUUID(),
      folderId,
      role,
      expiresAt,
    });
  });

  refreshFolder(folderId);
}

/** Turns the join link off. */
export async function revokeInvite(id: string) {
  const { user } = await requireUser();
  const { folderId } = await assertFolderRole(user.id, id, "OWNER");

  await db.orm.public.FolderInvite.where({ folderId }).delete();

  refreshFolder(folderId);
}

/** Joins a folder through its link (no-op if already a member). */
export async function acceptInvite(inviteId: string) {
  const { user } = await requireUser();
  if (!isUuid(inviteId)) throw new AccessDeniedError();

  const invite = await db.orm.public.FolderInvite.select("folderId", "role")
    .where({ id: inviteId })
    .where((i) => i.expiresAt.gt(new Date().toISOString()))
    .first();
  if (!invite || !isGuestRole(invite.role)) throw new AccessDeniedError();

  if (!(await roleIn(user.id, invite.folderId))) {
    try {
      await db.orm.public.FolderMember.create({
        folderId: invite.folderId,
        userId: user.id,
        role: invite.role,
      });
    } catch (error) {
      // A double click can race the unique (folderId, userId): already in.
      const joined = await db.orm.public.FolderMember.select("id")
        .where({ folderId: invite.folderId, userId: user.id })
        .first();
      if (!joined) throw error;
    }
  }

  refreshSidebar();
  redirect(`/carpetas/${invite.folderId}`);
}

export async function changeMemberRole(
  id: string,
  memberId: string,
  role: FolderRole,
) {
  const { user } = await requireUser();
  const { folderId } = await assertFolderRole(user.id, id, "OWNER");
  if (!isGuestRole(role) || memberId === user.id || !isUuid(memberId)) {
    throw new AccessDeniedError();
  }

  // Never touches the owner's own row (excluded above), only guests.
  await db.orm.public.FolderMember.where({ folderId, userId: memberId })
    .where((m) => m.role.neq("OWNER"))
    .update({ role });

  refreshFolder(folderId);
}

export async function removeMember(id: string, memberId: string) {
  const { user } = await requireUser();
  const { folderId } = await assertFolderRole(user.id, id, "OWNER");
  if (memberId === user.id || !isUuid(memberId)) {
    throw new AccessDeniedError();
  }

  const role = await roleIn(memberId, folderId);
  if (!role || role === "OWNER") throw new AccessDeniedError();

  await dropMember(folderId, memberId);

  refreshFolder(folderId);
}

/** Leaving keeps your places; they just stop being shown in the folder. */
export async function leaveFolder(id: string) {
  const { user } = await requireUser();
  const { folderId, role } = await assertFolderRole(user.id, id, "VIEWER");
  // The owner deletes the folder instead (transferring comes later).
  if (role === "OWNER") throw new AccessDeniedError();

  await dropMember(folderId, user.id);

  refreshSidebar();
  redirect("/carpetas");
}

/**
 * Removes a membership. The member's own places leave the folder with them,
 * so nobody keeps sharing into a group they're no longer part of.
 */
async function dropMember(folderId: string, userId: string) {
  await db.transaction(async (tx) => {
    await tx.orm.public.FolderMember.where({ folderId, userId }).delete();
    const ownPlaces = await tx.orm.public.Restaurant.select("id")
      .where({ ownerId: userId })
      .all();
    if (ownPlaces.length > 0) {
      await tx.orm.public.FolderPlace.where({ folderId })
        .where((l) => l.placeId.in(ownPlaces.map((p) => p.id)))
        .delete();
    }
  });
}

// ---------- Places in folders ----------

/** Only the place's owner shares it, into a folder where they can edit. */
export async function addPlaceToFolder(placeId: number, id: string) {
  const { user } = await requireUser();
  await assertOwnsPlace(user.id, placeId);
  const { folderId } = await assertFolderRole(user.id, id, "EDITOR");

  const existing = await db.orm.public.FolderPlace.select("id")
    .where({ folderId, placeId })
    .first();
  if (!existing) {
    await db.orm.public.FolderPlace.create({ folderId, placeId });
  }

  refreshFolder(folderId);
  revalidatePath(`/lugares/${placeId}`, "layout");
}

/** The place's owner, or the folder's owner, may take a place out. */
export async function removePlaceFromFolder(placeId: number, id: string) {
  const { user } = await requireUser();
  const role = await roleIn(user.id, id);
  if (!role) throw new AccessDeniedError();
  if (role !== "OWNER") await assertOwnsPlace(user.id, placeId);

  await db.orm.public.FolderPlace.where({ folderId: id, placeId }).delete();

  refreshFolder(id);
  revalidatePath(`/lugares/${placeId}`, "layout");
}

/** Form version for the folder page: the place comes from a <select>. */
export async function addPlaceToFolderForm(folderId: string, formData: FormData) {
  const placeId = Number(formData.get("placeId"));
  if (!Number.isInteger(placeId)) return;
  await addPlaceToFolder(placeId, folderId);
}

/** Form version for the place page: the folder comes from a <select>. */
export async function addToFolderFromPlaceForm(
  placeId: number,
  formData: FormData,
) {
  const folderId = String(formData.get("folderId") ?? "");
  await addPlaceToFolder(placeId, folderId);
}
