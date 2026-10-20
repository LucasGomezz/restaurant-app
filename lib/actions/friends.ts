"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  AccessDeniedError,
  areFriends,
  assertFolderRole,
  friendPair,
  isUuid,
  roleIn,
  type FolderRole,
} from "@/lib/access";
import { requireUser } from "@/lib/actions/guard";
import { normalizeUsername } from "@/lib/auth/validation";

// User ids arrive from the browser and can be forged: every action works
// only on friendships that include the caller (see lib/access.ts).

export type FriendRequestState = { error?: string; message?: string } | undefined;

/** /amigos and the sidebar badge show friendships: refresh both. */
function refreshFriends() {
  revalidatePath("/", "layout");
}

/**
 * Sends a request to an exact @username. If they had already asked the
 * caller, it accepts theirs instead.
 */
export async function sendFriendRequest(
  _prevState: FriendRequestState,
  formData: FormData,
): Promise<FriendRequestState> {
  const { user } = await requireUser();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  if (!username) return { error: "Escribí el usuario de tu amigo." };

  const other = await db.orm.public.Profile.select("id", "displayName")
    .where({ username })
    .first();
  if (!other) return { error: `No encontramos a @${username}.` };
  if (other.id === user.id) return { error: "Ese sos vos 🙂" };

  const pair = friendPair(user.id, other.id);
  const existing = await db.orm.public.Friendship.select("status", "requestedBy")
    .where(pair)
    .first();

  if (existing?.status === "ACCEPTED") {
    return { message: `Ya sos amigo de ${other.displayName}.` };
  }
  if (existing && existing.requestedBy === user.id) {
    return { message: `Ya le mandaste una solicitud a ${other.displayName}.` };
  }
  if (existing) {
    await db.orm.public.Friendship.where(pair).update({ status: "ACCEPTED" });
    refreshFriends();
    return { message: `${other.displayName} ya te había invitado: ahora son amigos.` };
  }

  try {
    await db.orm.public.Friendship.create({
      ...pair,
      status: "PENDING",
      requestedBy: user.id,
    });
  } catch (error) {
    // Both sent at the same time: the unique pair kept only one row.
    if (!(await db.orm.public.Friendship.select("id").where(pair).first())) {
      throw error;
    }
  }

  refreshFriends();
  return { message: `Le mandaste una solicitud a ${other.displayName}.` };
}

/** Accepts a request the other person sent to the caller. */
export async function acceptFriendRequest(otherId: string) {
  const { user } = await requireUser();
  if (!isUuid(otherId)) throw new AccessDeniedError();

  await db.orm.public.Friendship.where({
    ...friendPair(user.id, otherId),
    status: "PENDING",
    requestedBy: otherId,
  }).update({ status: "ACCEPTED" });

  refreshFriends();
}

/** Declines or cancels a request, or ends a friendship: the row goes away. */
export async function removeFriendship(otherId: string) {
  const { user } = await requireUser();
  if (!isUuid(otherId)) throw new AccessDeniedError();

  await db.orm.public.Friendship.where(friendPair(user.id, otherId)).delete();

  refreshFriends();
}

/** The folder owner adds a friend as a member, no link needed. */
export async function addFriendToFolder(
  id: string,
  friendId: string,
  role: FolderRole,
) {
  const { user } = await requireUser();
  const { folderId } = await assertFolderRole(user.id, id, "OWNER");
  if (role !== "EDITOR" && role !== "VIEWER") throw new AccessDeniedError();
  if (!(await areFriends(user.id, friendId))) throw new AccessDeniedError();

  if (!(await roleIn(friendId, folderId))) {
    try {
      await db.orm.public.FolderMember.create({ folderId, userId: friendId, role });
    } catch (error) {
      // A double click raced the unique (folderId, userId): already in.
      if (!(await roleIn(friendId, folderId))) throw error;
    }
  }

  revalidatePath(`/carpetas/${folderId}`, "layout");
}
