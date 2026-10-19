/**
 * Only the emails listed in ALLOWED_EMAILS (comma-separated) may use the app.
 * Supabase Auth would otherwise let anyone with the public anon key sign up
 * and get in. Fails closed: with the variable unset, nobody is allowed.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
