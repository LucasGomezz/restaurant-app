"use client";

import { Suspense, use } from "react";
import Link from "next/link";
import { formatShortDate } from "@/lib/format";
import type { PlacePreview } from "@/lib/queries/restaurants";
import type { RestaurantMarker } from "@/lib/types";

// Shared by the two map renderers: Map.tsx (MapLibre, vector, needs WebGL2)
// and LeafletMap.tsx (raster fallback for browsers without it).

export const VISITED_COLOR = "#059669";
export const PENDING_COLOR = "#f59e0b";
/** A shared pin mixing visited and pending places. */
export const MIXED_COLOR = "#0d857b";

// This module only loads in the browser (MapLoader uses ssr: false).
// With a mouse: hover previews a place and a click opens it.
// On touch screens there's no hover, so a tap opens the preview instead.
export const CAN_HOVER = window.matchMedia("(hover: hover)").matches;

export function colorFor(visited: number, total: number) {
  if (visited === total) return VISITED_COLOR;
  return visited === 0 ? PENDING_COLOR : MIXED_COLOR;
}

/** Places closer than ~1 m share a pin (e.g. two events at the same venue). */
export function groupByLocation(restaurants: RestaurantMarker[]) {
  const groups = new globalThis.Map<string, RestaurantMarker[]>();
  for (const place of restaurants) {
    const key = `${place.lat.toFixed(5)},${place.lng.toFixed(5)}`;
    groups.set(key, [...(groups.get(key) ?? []), place]);
  }
  return groups;
}

const previews = new globalThis.Map<string, Promise<PlacePreview | null>>();

/** Fetched once per place and page view (the answer has signed URLs). */
export function loadPreview(id: string) {
  let promise = previews.get(id);
  if (!promise) {
    promise = fetch(`/api/lugares/${id}/preview`)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    previews.set(id, promise);
  }
  return promise;
}

function PreviewPhotos({ id, name }: { id: string; name: string }) {
  const preview = use(loadPreview(id));
  if (!preview || preview.photos.length === 0) return null;
  return (
    <div className="flex h-40 gap-1 overflow-hidden rounded-lg bg-stone-100">
      {preview.photos.map((url) => (
        // Signed Supabase URLs inside a map popup: a plain <img> is simplest.
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt={name} className="h-full min-w-0 flex-1 object-cover" />
      ))}
    </div>
  );
}

function PreviewVisit({ id }: { id: string }) {
  const preview = use(loadPreview(id));
  if (!preview?.date) return null;
  return (
    <>
      <p className="text-xs text-stone-500">
        🗓 {formatShortDate(preview.date)}
        {preview.visitCount > 1 && ` · 🔁 Fueron ${preview.visitCount} veces`}
      </p>
      {preview.text && (
        <p className="line-clamp-2 text-xs text-stone-600">{preview.text}</p>
      )}
    </>
  );
}

export function PreviewCard({ place, sticky }: { place: RestaurantMarker; sticky: boolean }) {
  return (
    <div className={`flex flex-col gap-2 ${sticky ? "w-56" : "w-64"}`}>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-stone-100" />}>
        <PreviewPhotos id={place.id} name={place.name} />
      </Suspense>
      <div className="flex flex-col gap-0.5 px-1">
        {sticky && <StatusLine place={place} />}
        <p className="text-sm font-semibold text-stone-900">{place.name}</p>
        <Suspense fallback={null}>
          <PreviewVisit id={place.id} />
        </Suspense>
        {sticky && place.address && (
          <p className="text-xs text-stone-500">{place.address}</p>
        )}
        {sticky && (
          <Link href={`/lugares/${place.id}`} className="link mt-1 text-sm">
            Ver detalle →
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusLine({ place }: { place: RestaurantMarker }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${
          place.status === "VISITED"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-700"
        }`}
      >
        {place.status === "VISITED" ? "Visitado" : "Pendiente"}
      </span>
      <span className="text-xs text-stone-500">
        {place.icon} {place.typeLabel}
      </span>
    </span>
  );
}

/** Several places at the same spot: tapping their pin lists them all. */
export function GroupList({ places }: { places: RestaurantMarker[] }) {
  return (
    <div className="flex w-60 flex-col gap-2">
      <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
        {places.length} en este lugar
      </p>
      {places[0].address && (
        <p className="-mt-1 truncate text-xs text-stone-500">{places[0].address}</p>
      )}
      <ul className="flex max-h-72 flex-col divide-y divide-stone-100 overflow-y-auto">
        {[...places]
          .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
          .map((place) => (
            <li key={place.id}>
              <Link
                href={`/lugares/${place.id}`}
                className="flex items-center gap-2.5 py-2 text-stone-900 transition hover:text-brand-700"
              >
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-lg bg-stone-100 text-lg"
                  aria-hidden
                >
                  {place.icon}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{place.name}</span>
                  <span className="flex items-center gap-1 text-xs text-stone-500">
                    <span
                      className="size-2 rounded-full"
                      style={{
                        background:
                          place.status === "VISITED" ? VISITED_COLOR : PENDING_COLOR,
                      }}
                    />
                    {place.status === "VISITED" ? "Visitado" : "Pendiente"} ·{" "}
                    {place.icon} {place.typeLabel}
                  </span>
                  {place.date && (
                    <span className="text-[11px] text-stone-400">
                      🗓 {formatShortDate(place.date)}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
      </ul>
    </div>
  );
}
