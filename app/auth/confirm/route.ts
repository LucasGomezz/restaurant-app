import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing for the links Supabase emails (account confirmation, password
 * reset). Turns the link into a session cookie and moves on to `next`.
 *
 * Two link shapes are accepted:
 * - `?code=` (PKCE, Supabase's default templates): only works in the same
 *   browser where the user signed up or asked for the reset.
 * - `?token_hash=&type=` (custom templates): works on any device.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNextPath(params.get("next"));
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let failed = true;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    failed = Boolean(error);
  }

  redirect(failed ? "/login?error=link" : next);
}
