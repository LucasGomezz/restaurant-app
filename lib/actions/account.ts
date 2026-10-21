"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/actions/guard";
import { deletePhotos } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AccountState = { error?: string; message?: string } | undefined;

export async function updateDisplayName(
  _prevState: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const { user } = await requireUser();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) return { error: "Contanos cómo querés que te vean." };
  if (displayName.length > 50) {
    return { error: "El nombre puede tener hasta 50 caracteres." };
  }

  await db.orm.public.Profile.where({ id: user.id }).update({ displayName });

  revalidatePath("/", "layout");
  return { message: "Listo, guardamos tu nombre." };
}

/**
 * Deletes the account and everything it owns: places (with visits, dishes
 * and photo files), custom types, friendships, memberships, the folders it
 * owns, and the Supabase Auth user. Other members' places in those folders
 * stay theirs. Asks for the @username as confirmation.
 */
export async function deleteAccount(
  _prevState: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const { user, profile } = await requireUser();
  const typed = String(formData.get("confirm") ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
  if (typed !== profile.username) {
    return { error: `Escribí tu usuario (${profile.username}) para confirmar.` };
  }

  // Files go after the rows, so collect their paths first.
  const places = await db.orm.public.Restaurant.select("id")
    .where({ ownerId: user.id })
    .include("visits", (v) =>
      v
        .select("coupleImageUrl", "placeImageUrl")
        .include("dishes", (d) => d.select("imageUrl"))
        .include("photos", (p) => p.select("path")),
    )
    .all();
  const paths = places.flatMap((place) =>
    place.visits.flatMap((visit) => [
      visit.coupleImageUrl,
      visit.placeImageUrl,
      ...visit.dishes.map((dish) => dish.imageUrl),
      ...visit.photos.map((photo) => photo.path),
    ]),
  );

  const owned = await db.orm.public.FolderMember.select("folderId")
    .where({ userId: user.id, role: "OWNER" })
    .all();

  await db.transaction(async (tx) => {
    for (const { folderId } of owned) {
      await tx.orm.public.Folder.where({ id: folderId }).delete();
    }
    // Cascades to places, visits, dishes, photos, categories, memberships
    // and friendships (see src/prisma/contract.prisma).
    await tx.orm.public.Profile.where({ id: user.id }).delete();
  });

  // Storage accepts a limited batch per call.
  const files = paths.filter((path): path is string => Boolean(path));
  for (let i = 0; i < files.length; i += 100) {
    await deletePhotos(files.slice(i, i + 100));
  }

  await createAdminClient().auth.admin.deleteUser(user.id);
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/?cuenta=eliminada");
}
