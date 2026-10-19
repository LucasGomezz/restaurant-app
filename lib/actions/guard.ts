import "server-only";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    throw new Error("Unauthorized");
  }

  return user;
}
