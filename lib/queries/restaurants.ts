import "server-only";
import { db } from "@/lib/db";
import { typeOf, type PlaceType } from "@/lib/places";
import { getSignedUrls } from "@/lib/storage";
import type { RestaurantMarker } from "@/lib/types";

// The `Restaurant` model holds every place: restaurants, trips and events.

type PlaceQuery = ReturnType<typeof db.orm.public.Restaurant.where>;

/**
 * Narrows a query to one type: a category matches by id; a built-in kind
 * matches only places without a category (a "Bodega" isn't a "Restaurante").
 */
function ofType(query: PlaceQuery, type?: PlaceType): PlaceQuery {
  if (!type) return query;
  if (type.categoryId !== null) {
    return query.where({ categoryId: type.categoryId });
  }
  return query.where({ kind: type.kind }).where((r) => r.categoryId.isNull());
}

/** Newest visit first (by date, then by when it was added). */
function newestFirst<V extends { id: number; visitDate: string }>(
  visits: V[],
): V[] {
  return [...visits].sort(
    (a, b) => b.visitDate.localeCompare(a.visitDate) || b.id - a.id,
  );
}

/** The newest visit that has the given photo, so the latest photo wins. */
function latestWith<V, K extends keyof V>(visits: V[], key: K) {
  return visits.find((visit) => visit[key] != null);
}

export async function getRestaurantMarkers(
  types: PlaceType[],
  type?: PlaceType,
): Promise<RestaurantMarker[]> {
  const rows = await ofType(db.orm.public.Restaurant.where({}), type)
    .select(
      "id",
      "name",
      "address",
      "lat",
      "lng",
      "status",
      "kind",
      "categoryId",
      "eventDate",
    )
    .include("visits", (v) =>
      v.select(
        "id",
        "visitDate",
        "description",
        "coupleImageUrl",
        "placeImageUrl",
      ),
    )
    .all();

  // The map previews the latest visit only: its photos, date and text.
  const places = rows.map((row) => {
    const [latest] = newestFirst(row.visits);
    return {
      row,
      latest,
      cover: latest?.coupleImageUrl ?? null,
      place: latest?.placeImageUrl ?? null,
    };
  });

  const urls = await getSignedUrls(places.flatMap((p) => [p.cover, p.place]));
  const signed = (path: string | null) =>
    path ? (urls.get(path) ?? null) : null;

  return places.map(({ row, latest, cover, place }) => ({
    id: String(row.id),
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    kind: row.kind,
    icon: typeOf(types, row).icon,
    typeLabel: typeOf(types, row).label,
    date: latest?.visitDate ?? row.eventDate,
    visitCount: row.visits.length,
    lastVisitText: latest?.description ?? null,
    coverUrl: signed(cover),
    placeUrl: signed(place),
  }));
}

export async function getPendingRestaurants(type?: PlaceType) {
  const rows = await ofType(
    db.orm.public.Restaurant.where({ status: "PENDING" }),
    type,
  )
    .select(
      "id",
      "name",
      "address",
      "notes",
      "kind",
      "categoryId",
      "eventDate",
      "createdAt",
    )
    .orderBy((r) => r.createdAt.desc())
    .all();

  // Events are listed by when they happen (soonest first, undated last);
  // everything else keeps newest-added first.
  if (type?.kind !== "EVENT") return rows;
  return [...rows].sort((a, b) => {
    if (!a.eventDate) return b.eventDate ? 1 : 0;
    if (!b.eventDate) return -1;
    return a.eventDate.localeCompare(b.eventDate);
  });
}

/** One card per place: dated by its latest visit, with its latest cover. */
export async function getVisitedRestaurants(type?: PlaceType) {
  const rows = await ofType(
    db.orm.public.Restaurant.where({ status: "VISITED" }),
    type,
  )
    .select("id", "name", "kind", "categoryId")
    .include("visits", (v) =>
      v.select(
        "id",
        "visitDate",
        "endDate",
        "coupleImageUrl",
        "coupleImageRatio",
      ),
    )
    .all();

  const places = rows
    .filter((row) => row.visits.length > 0)
    .map((row) => {
      const visits = newestFirst(row.visits);
      return {
        row,
        latest: visits[0],
        cover: latestWith(visits, "coupleImageUrl"),
      };
    });

  const urls = await getSignedUrls(
    places.map(({ cover }) => cover?.coupleImageUrl ?? null),
  );

  return places
    .map(({ row, latest, cover }) => ({
      id: String(row.id),
      name: row.name,
      kind: row.kind,
      categoryId: row.categoryId,
      visitCount: row.visits.length,
      visitDate: latest.visitDate,
      endDate: latest.endDate,
      coverRatio: cover?.coupleImageRatio ?? null,
      coverUrl: cover?.coupleImageUrl
        ? (urls.get(cover.coupleImageUrl) ?? null)
        : null,
    }))
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
}

/** The place with every visit (newest first) and their signed photo URLs. */
export async function getRestaurantDetail(id: number) {
  const restaurant = await db.orm.public.Restaurant.where({ id })
    .include("visits", (v) =>
      v
        .include("dishes", (d) => d.orderBy((row) => row.id.asc()))
        .include("photos", (p) => p.orderBy((row) => row.position.asc())),
    )
    .first();

  if (!restaurant) return null;

  const visits = newestFirst(restaurant.visits);
  const urls = await getSignedUrls(
    visits.flatMap((visit) => [
      visit.coupleImageUrl,
      visit.placeImageUrl,
      ...visit.dishes.map((dish) => dish.imageUrl),
      ...visit.photos.map((photo) => photo.path),
    ]),
  );
  const signed = (path: string | null) =>
    path ? (urls.get(path) ?? null) : null;

  return {
    restaurant,
    visits: visits.map((visit) => ({
      ...visit,
      coverUrl: signed(visit.coupleImageUrl),
      placeUrl: signed(visit.placeImageUrl),
      dishes: visit.dishes.map((dish) => ({
        ...dish,
        imageDisplayUrl: signed(dish.imageUrl),
      })),
      photos: visit.photos
        .map((photo) => ({ id: photo.id, url: signed(photo.path) }))
        .filter((photo): photo is { id: number; url: string } =>
          Boolean(photo.url),
        ),
    })),
  };
}

/** Every location already used, for picking the same spot again. */
export async function getKnownLocations() {
  return db.orm.public.Restaurant.select("name", "address", "lat", "lng")
    .orderBy((r) => r.createdAt.desc())
    .all();
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
