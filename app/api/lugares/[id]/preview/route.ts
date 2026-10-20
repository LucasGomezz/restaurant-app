import { NextResponse } from "next/server";
import { getCurrentUser, getProfile } from "@/lib/auth/session";
import { getPlacePreview } from "@/lib/queries/restaurants";

/** Photos and latest visit of one place, for its map pin (see lib/access.ts). */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/lugares/[id]/preview">,
) {
  const user = await getCurrentUser();
  if (!user || !(await getProfile(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number((await params).id);
  const preview = Number.isInteger(id) ? await getPlacePreview(id) : null;
  if (!preview) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Signed URLs expire in an hour; let the browser reuse the answer briefly.
  return NextResponse.json(preview, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
