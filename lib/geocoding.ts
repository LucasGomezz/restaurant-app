import "server-only";
import { db } from "@/lib/db";

/**
 * Address search behind one interface, so the provider is a config change:
 * - Nominatim (OpenStreetMap) by default: free, but its policy allows light
 *   use only (1 request per second, no heavy commercial traffic).
 * - Geoapify when GEOAPIFY_API_KEY is set: free tier allows commercial use;
 *   paid plans when traffic grows. See docs/arquitectura.md.
 * Answers are cached in the database for CACHE_DAYS, per provider and query.
 */

export type GeocodeResult = { displayName: string; lat: number; lng: number };

type Geocoder = {
  name: string;
  search: (query: string) => Promise<GeocodeResult[]>;
};

const RESULTS = 5;
const CACHE_DAYS = 30;

export class GeocodingError extends Error {}

// Nominatim allows one request per second per app: queue them in-process.
let nominatimQueue: Promise<unknown> = Promise.resolve();
function oncePerSecond<T>(task: () => Promise<T>): Promise<T> {
  const run = nominatimQueue.then(task);
  nominatimQueue = run
    .catch(() => {})
    .then(() => new Promise((resolve) => setTimeout(resolve, 1000)));
  return run;
}

const nominatim: Geocoder = {
  name: "nominatim",
  search: (query) =>
    oncePerSecond(async () => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", query);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", String(RESULTS));
      const response = await fetch(url, {
        headers: {
          // Nominatim asks apps to identify themselves, ideally with a contact.
          "User-Agent": process.env.NOMINATIM_CONTACT
            ? `nuestro-camino/1.0 (${process.env.NOMINATIM_CONTACT})`
            : "nuestro-camino/1.0",
          "Accept-Language": "es",
        },
      });
      if (!response.ok) throw new GeocodingError(`Nominatim ${response.status}`);
      const data = (await response.json()) as {
        display_name: string;
        lat: string;
        lon: string;
      }[];
      return data.map((item) => ({
        displayName: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
      }));
    }),
};

function geoapify(apiKey: string): Geocoder {
  return {
    name: "geoapify",
    async search(query) {
      const url = new URL("https://api.geoapify.com/v1/geocode/search");
      url.searchParams.set("text", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("lang", "es");
      url.searchParams.set("limit", String(RESULTS));
      url.searchParams.set("apiKey", apiKey);
      const response = await fetch(url);
      if (!response.ok) throw new GeocodingError(`Geoapify ${response.status}`);
      const data = (await response.json()) as {
        results?: { formatted: string; lat: number; lon: number }[];
      };
      return (data.results ?? []).map((item) => ({
        displayName: item.formatted,
        lat: item.lat,
        lng: item.lon,
      }));
    },
  };
}

function activeGeocoder(): Geocoder {
  const key = process.env.GEOAPIFY_API_KEY;
  return key ? geoapify(key) : nominatim;
}

/** "  Av. CORRIENTES   1234 " → "av. corrientes 1234". */
function normalize(query: string) {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function geocode(query: string): Promise<GeocodeResult[]> {
  const geocoder = activeGeocoder();
  const key = `${geocoder.name}:${normalize(query)}`;
  const freshSince = new Date(
    Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const cached = await db.orm.public.GeocodeCache.select("results")
    .where({ key })
    .where((row) => row.createdAt.gt(freshSince))
    .first();
  if (cached) return JSON.parse(cached.results) as GeocodeResult[];

  const results = await geocoder.search(query);

  // Replace any stale entry; a concurrent identical search may win the race.
  await db.orm.public.GeocodeCache.where({ key }).delete();
  await db.orm.public.GeocodeCache.create({
    key,
    results: JSON.stringify(results),
  }).catch(() => {});

  return results;
}
