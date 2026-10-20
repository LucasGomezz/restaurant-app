import "server-only";
import { getCurrentUser, getProfile } from "@/lib/auth/session";

/**
 * For Server Actions: throws unless the caller is signed in and has finished
 * setting up their profile. Pages use `requireProfile()`, which redirects.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const profile = await getProfile(user.id);
  if (!profile) throw new Error("Unauthorized");

  return { user, profile };
}
