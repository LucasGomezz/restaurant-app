import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import { createClient } from "@/lib/supabase/server";

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "restaurantes-app/1.0 (uso personal)",
      "Accept-Language": "es",
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "No se pudo buscar la dirección." },
      { status: 502 },
    );
  }

  const data = (await response.json()) as NominatimResult[];

  return NextResponse.json({
    results: data.map((item) => ({
      displayName: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
    })),
  });
}
