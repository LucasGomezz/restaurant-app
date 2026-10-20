import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, getProfile } from "@/lib/auth/session";
import { geocode } from "@/lib/geocoding";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !(await getProfile(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }
  if (query.length > 200) {
    return NextResponse.json({ error: "La búsqueda es muy larga." }, { status: 400 });
  }

  try {
    return NextResponse.json({ results: await geocode(query) });
  } catch {
    return NextResponse.json(
      { error: "No se pudo buscar la dirección." },
      { status: 502 },
    );
  }
}
