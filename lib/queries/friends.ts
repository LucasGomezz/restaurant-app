import "server-only";
import { or } from "@prisma/orm-postgres/orm-client";
import { db } from "@/lib/db";
import { roleIn } from "@/lib/access";
import { requireProfile } from "@/lib/auth/session";

export type FriendProfile = { id: string; username: string; displayName: string };

/** Every friendship row involving the user, with the other person's profile. */
async function friendshipsOf(userId: string) {
  const rows = await db.orm.public.Friendship.select(
    "userLow",
    "userHigh",
    "status",
    "requestedBy",
    "createdAt",
  )
    .where((f) => or(f.userLow.eq(userId), f.userHigh.eq(userId)))
    .include("low", (p) => p.select("id", "username", "displayName"))
    .include("high", (p) => p.select("id", "username", "displayName"))
    .orderBy((f) => f.createdAt.desc())
    .all();

  return rows.map((row) => ({
    status: row.status,
    sentByMe: row.requestedBy === userId,
    other: (row.userLow === userId ? row.high : row.low) as FriendProfile,
  }));
}

/** The /amigos page: friends, requests received and requests sent. */
export async function getFriendsOverview() {
  const { user } = await requireProfile();
  const rows = await friendshipsOf(user.id);
  const byName = (a: FriendProfile, b: FriendProfile) =>
    a.displayName.localeCompare(b.displayName, "es");

  return {
    friends: rows
      .filter((r) => r.status === "ACCEPTED")
      .map((r) => r.other)
      .sort(byName),
    received: rows
      .filter((r) => r.status === "PENDING" && !r.sentByMe)
      .map((r) => r.other),
    sent: rows
      .filter((r) => r.status === "PENDING" && r.sentByMe)
      .map((r) => r.other),
  };
}

/** Requests waiting for the user's answer, for the sidebar badge. */
export async function getReceivedRequestCount() {
  const { user } = await requireProfile();
  const rows = await db.orm.public.Friendship.select("id")
    .where({ status: "PENDING" })
    .where((f) => or(f.userLow.eq(user.id), f.userHigh.eq(user.id)))
    .where((f) => f.requestedBy.neq(user.id))
    .all();
  return rows.length;
}

/** Friends who aren't in the folder yet; only its owner gets any. */
export async function getFriendsToAdd(folderId: string) {
  const { user } = await requireProfile();
  if ((await roleIn(user.id, folderId)) !== "OWNER") return [];

  const [rows, members] = await Promise.all([
    friendshipsOf(user.id),
    db.orm.public.FolderMember.select("userId").where({ folderId }).all(),
  ]);
  const memberIds = new Set(members.map((m) => m.userId));
  return rows
    .filter((r) => r.status === "ACCEPTED" && !memberIds.has(r.other.id))
    .map((r) => r.other)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
}
