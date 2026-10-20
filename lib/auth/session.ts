import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in Supabase user, verified against the Auth server (not just
 * read from the cookie). Memoized per render pass.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (userId: string) => {
  return db.orm.public.Profile.select("id", "username", "displayName")
    .where({ id: userId })
    .first();
});

/**
 * For pages that need a complete account: sends visitors to /login and
 * signed-in users without a profile to /bienvenida.
 */
export async function requireProfile() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/bienvenida");

  return { user, profile };
}
