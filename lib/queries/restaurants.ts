import "server-only";
import { db } from "@/lib/db";
import { inFolder, placePermissions, visiblePlacesQuery } from "@/lib/access";
import { requireProfile } from "@/lib/auth/session";
import { typeOf, type PlaceType } from "@/lib/places";
import { getSignedUrls } from "@/lib/storage";
import type { RestaurantMarker } from "@/lib/types";

// The `Restaurant` model holds every place: restaurants, trips and events.
// Every query here reads the signed-in user itself and only returns what
// lib/access.ts lets them see, so a page can't forget the filter.

/** A `Restaurant` query over the places the signed-in user may see. */
async function visiblePlaces() {
  const { user } = await requireProfile();
  return visiblePlacesQuery(user.id);
}

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

/** Map pins: every visible place, or only those of one folder. */
export async function getRestaurantMarkers(
  types: PlaceType[],
  type?: PlaceType,
  folderId?: string,
): Promise<RestaurantMarker[]> {
  const { user } = await requireProfile();
  let query = await visiblePlaces();
  if (folderId) query = inFolder(query, folderId);
  const rows = await ofType(query, type)
    .select(
      "id",
      "ownerId",
      "name",
      "address",
      "lat",
      "lng",
      "status",
      "kind",
      "categoryId",
      "eventDate",
    )
    // Dates only: photos and text load when a pin is opened (getPlacePreview).
    .include("visits", (v) => v.select("id", "visitDate"))
    .all();

  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    kind: row.kind,
    icon: typeOf(types, row).icon,
    typeLabel: typeOf(types, row).label,
    date: newestFirst(row.visits)[0]?.visitDate ?? row.eventDate,
    visitCount: row.visits.length,
    isOwn: row.ownerId === user.id,
  }));
}

/**
 * What a map pin shows when opened: the latest visit's photos (signed),
 * date and text. One place at a time, so the map never signs every photo.
 */
export async function getPlacePreview(id: number) {
  const place = await (await visiblePlaces())
    .where({ id })
    .select("id", "eventDate")
    .include("visits", (v) =>
      v.select("id", "visitDate", "description", "coupleImageUrl", "placeImageUrl"),
    )
    .first();
  if (!place) return null;

  const [latest] = newestFirst(place.visits);
  const paths = [latest?.coupleImageUrl ?? null, latest?.placeImageUrl ?? null];
  const urls = await getSignedUrls(paths);

  return {
    photos: paths
      .map((path) => (path ? urls.get(path) : undefined))
      .filter((url): url is string => Boolean(url)),
    date: latest?.visitDate ?? place.eventDate,
    visitCount: place.visits.length,
    text: latest?.description ?? null,
  };
}

export type PlacePreview = NonNullable<Awaited<ReturnType<typeof getPlacePreview>>>;

export async function getPendingRestaurants(type?: PlaceType) {
  const rows = await ofType(
    (await visiblePlaces()).where({ status: "PENDING" }),
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
    (await visiblePlaces()).where({ status: "VISITED" }),
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
  const { user } = await requireProfile();
  const restaurant = await (await visiblePlaces())
    .where({ id })
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

  const [permissions, sharedBy] = await Promise.all([
    placePermissions(user.id, restaurant),
    restaurant.ownerId && restaurant.ownerId !== user.id
      ? db.orm.public.Profile.select("username", "displayName")
          .where({ id: restaurant.ownerId })
          .first()
      : null,
  ]);

  return {
    restaurant,
    permissions,
    /** Who shared it, when it isn't the user's own place. */
    sharedBy,
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
  return (await visiblePlaces())
    .select("name", "address", "lat", "lng")
    .orderBy((r) => r.createdAt.desc())
    .all();
}

/** The fields of a place for its edit form; null unless the user may edit it. */
export async function getPlaceForEdit(id: number) {
  const { user } = await requireProfile();
  const place = await (await visiblePlaces())
    .where({ id })
    .select(
      "id",
      "ownerId",
      "name",
      "address",
      "notes",
      "kind",
      "categoryId",
      "eventDate",
      "lat",
      "lng",
    )
    .first();
  if (!place || !(await placePermissions(user.id, place)).canEdit) return null;
  return place;
}
