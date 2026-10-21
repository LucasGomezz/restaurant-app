import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/validation";

/** Pages for signed-out visitors; signed-in users are sent home instead. */
const GUEST_PATHS = ["/login", "/registro", "/recuperar"];
/** Open to everyone: the landing, legal pages and email-link landings. */
const PUBLIC_PATHS = ["/", "/terminos", "/privacidad", "/robots.txt"];
const PUBLIC_PREFIXES = ["/auth/"];

/** Redirect that keeps the session cookies getUser() may have just refreshed. */
function redirectTo(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  next?: string,
  search = "",
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = next ? `?next=${encodeURIComponent(next)}` : search;
  const redirect = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not run any code between createServerClient and getUser(): it
  // refreshes the session and must be able to write the new cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isGuestPath = GUEST_PATHS.includes(pathname);
  const isPublicPath =
    isGuestPath ||
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // Only an optimistic check: pages and actions verify the session (and the
  // profile) again close to the data, see lib/auth/session.ts.
  if (!user && !isPublicPath) {
    // Come back here after signing in (e.g. a folder invitation link).
    const next =
      request.method === "GET" && pathname !== "/"
        ? pathname + request.nextUrl.search
        : undefined;
    return redirectTo(request, response, "/login", next);
  }

  if (user && isGuestPath) {
    const target = new URL(
      safeNextPath(request.nextUrl.searchParams.get("next")),
      request.url,
    );
    return redirectTo(request, response, target.pathname, undefined, target.search);
  }

  return response;
}
