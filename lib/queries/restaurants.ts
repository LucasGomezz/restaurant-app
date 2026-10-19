import "server-only";
import { db } from "@/lib/db";
import type { PlaceKind } from "@/lib/places";
import { getSignedUrl, getSignedUrls } from "@/lib/storage";
import type { RestaurantMarker } from "@/lib/types";

// The `Restaurant` model holds every place: restaurants, trips and events.

export async function getRestaurantMarkers(
  kind?: PlaceKind,
): Promise<RestaurantMarker[]> {
  const rows = await db.orm.public.Restaurant.select(
    "id",
    "name",
    "address",
    "lat",
    "lng",
    "status",
    "kind",
  )
    .where(kind ? { kind } : {})
    .include("visit", (v) => v.select("coupleImageUrl", "placeImageUrl"))
    .all();

  const urls = await getSignedUrls(
    rows.flatMap((row) => [
      row.visit?.coupleImageUrl ?? null,
      row.visit?.placeImageUrl ?? null,
    ]),
  );
  const signed = (path: string | null | undefined) =>
    path ? (urls.get(path) ?? null) : null;

  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    kind: row.kind,
    coverUrl: signed(row.visit?.coupleImageUrl),
    placeUrl: signed(row.visit?.placeImageUrl),
  }));
}

export async function getPendingRestaurants(kind?: PlaceKind) {
  const rows = await db.orm.public.Restaurant.select(
    "id",
    "name",
    "address",
    "notes",
    "kind",
    "eventDate",
    "createdAt",
  )
    .where(kind ? { status: "PENDING", kind } : { status: "PENDING" })
    .orderBy((r) => r.createdAt.desc())
    .all();

  // Events are listed by when they happen (soonest first, undated last);
  // everything else keeps newest-added first.
  if (kind !== "EVENT") return rows;
  return [...rows].sort((a, b) => {
    if (!a.eventDate) return b.eventDate ? 1 : 0;
    if (!b.eventDate) return -1;
    return a.eventDate.localeCompare(b.eventDate);
  });
}

export async function getVisitedRestaurants(kind?: PlaceKind) {
  const rows = await db.orm.public.Restaurant.select("id", "name", "kind")
    .where(kind ? { status: "VISITED", kind } : { status: "VISITED" })
    .include("visit", (v) =>
      v.select("visitDate", "endDate", "coupleImageUrl", "coupleImageRatio"),
    )
    .all();

  const urls = await getSignedUrls(
    rows.map((row) => row.visit?.coupleImageUrl ?? null),
  );

  return rows
    .filter((row) => row.visit !== null)
    .map((row) => ({
      id: String(row.id),
      name: row.name,
      kind: row.kind,
      visitDate: row.visit!.visitDate,
      endDate: row.visit!.endDate,
      coverRatio: row.visit!.coupleImageRatio,
      coverUrl: row.visit!.coupleImageUrl
        ? (urls.get(row.visit!.coupleImageUrl) ?? null)
        : null,
    }))
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
}

export async function getRestaurantDetail(id: number) {
  const restaurant = await db.orm.public.Restaurant.where({ id })
    .include("visit", (v) =>
      v
        .include("dishes", (d) => d.orderBy((row) => row.id.asc()))
        .include("photos", (p) => p.orderBy((row) => row.position.asc())),
    )
    .first();

  if (!restaurant) return null;

  if (!restaurant.visit) {
    return { restaurant, visit: null };
  }

  const [coverUrl, placeUrl, fileUrls] = await Promise.all([
    getSignedUrl(restaurant.visit.coupleImageUrl),
    getSignedUrl(restaurant.visit.placeImageUrl),
    getSignedUrls([
      ...restaurant.visit.dishes.map((dish) => dish.imageUrl),
      ...restaurant.visit.photos.map((photo) => photo.path),
    ]),
  ]);

  return {
    restaurant,
    visit: {
      ...restaurant.visit,
      coverUrl,
      placeUrl,
      dishes: restaurant.visit.dishes.map((dish) => ({
        ...dish,
        imageDisplayUrl: dish.imageUrl
          ? (fileUrls.get(dish.imageUrl) ?? null)
          : null,
      })),
      photos: restaurant.visit.photos
        .map((photo) => ({ id: photo.id, url: fileUrls.get(photo.path) }))
        .filter((photo): photo is { id: number; url: string } =>
          Boolean(photo.url),
        ),
    },
  };
}

/**
 * A random selection of every uploaded photo (couple, place, carousel and
 * dishes) as signed URLs, without repeats. Feeds the photo mural behind the
 * login; a new selection and order on every request.
 */
export async function getMuralPhotos(limit = 54): Promise<string[]> {
  const [visits, photos, dishes] = await Promise.all([
    db.orm.public.Visit.select("coupleImageUrl", "placeImageUrl").all(),
    db.orm.public.Photo.select("path").all(),
    db.orm.public.Dish.select("imageUrl").all(),
  ]);

  const paths = [
    ...visits.flatMap((v) => [v.coupleImageUrl, v.placeImageUrl]),
    ...photos.map((p) => p.path),
    ...dishes.map((d) => d.imageUrl),
  ];
  const chosen = shuffle([
    ...new Set(paths.filter((p): p is string => Boolean(p))),
  ]).slice(0, limit);

  const urls = await getSignedUrls(chosen);
  return chosen
    .map((path) => urls.get(path))
    .filter((u): u is string => Boolean(u));
}

/** Fisher–Yates shuffle (returns a new array). */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
