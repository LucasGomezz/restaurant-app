"use client";

import {
  Suspense,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
} from "maplibre-gl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { formatShortDate } from "@/lib/format";
import type { PlacePreview } from "@/lib/queries/restaurants";
import type { RestaurantMarker } from "@/lib/types";

/**
 * Vector map style. OpenFreeMap is free, keyless and allows commercial use;
 * point NEXT_PUBLIC_MAP_STYLE_URL at a paid provider (MapTiler, Stadia…)
 * when traffic grows. See docs/arquitectura.md.
 */
const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://tiles.openfreemap.org/styles/liberty";

const VISITED_COLOR = "#059669";
const PENDING_COLOR = "#f59e0b";
/** A pin or cluster mixing visited and pending places. */
const MIXED_COLOR = "#0d857b";
const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816];
/** Past this zoom every pin shows on its own. */
const CLUSTER_MAX_ZOOM = 14;

// Served from public/ (see scripts/copy-maplibre-worker.mjs): MapLibre's own
// lookup of its worker file doesn't survive bundling.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

// This module only loads in the browser (MapLoader uses ssr: false).
// With a mouse: hover previews a place and a click opens it.
// On touch screens there's no hover, so a tap opens the preview instead.
const CAN_HOVER = window.matchMedia("(hover: hover)").matches;

type Position = { lat: number; lng: number };

type MapProps = {
  restaurants: RestaurantMarker[];
  center?: [number, number];
  zoom?: number;
  onMapClick?: (lat: number, lng: number) => void;
  selected?: Position | null;
  scrollWheelZoom?: boolean;
};

// ---------- Pins ----------

function colorFor(visited: number, total: number) {
  if (visited === total) return VISITED_COLOR;
  return visited === 0 ? PENDING_COLOR : MIXED_COLOR;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}

/** A teardrop pin with an emoji (or count) and the place name under it. */
function pinElement(color: string, content: string, label?: string) {
  const element = document.createElement("div");
  element.className = "map-pin";
  element.innerHTML =
    `<span class="map-pin-drop" style="background:${color}"><span class="map-pin-icon">${content}</span></span>` +
    (label ? `<span class="map-pin-label">${escapeHtml(label)}</span>` : "");
  return element;
}

function clusterElement(count: number, color: string) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "map-cluster";
  element.style.background = color;
  element.style.setProperty("--size", `${Math.min(56, 30 + Math.log2(count) * 6)}px`);
  element.textContent = String(count);
  element.setAttribute("aria-label", `${count} lugares: acercar`);
  return element;
}

/** Places closer than ~1 m share a pin (e.g. two events at the same venue). */
function groupByLocation(restaurants: RestaurantMarker[]) {
  const groups = new globalThis.Map<string, RestaurantMarker[]>();
  for (const place of restaurants) {
    const key = `${place.lat.toFixed(5)},${place.lng.toFixed(5)}`;
    groups.set(key, [...(groups.get(key) ?? []), place]);
  }
  return groups;
}

function toGeoJSON(groups: globalThis.Map<string, RestaurantMarker[]>) {
  return {
    type: "FeatureCollection" as const,
    features: [...groups.entries()].map(([key, places]) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [places[0].lng, places[0].lat],
      },
      properties: {
        key,
        total: places.length,
        visited: places.filter((p) => p.status === "VISITED").length,
      },
    })),
  };
}

// ---------- Popups ----------

type PopupState =
  | { kind: "preview"; place: RestaurantMarker; sticky: boolean }
  | { kind: "group"; places: RestaurantMarker[] };

const previews = new globalThis.Map<string, Promise<PlacePreview | null>>();

/** Fetched once per place and page view (the answer has signed URLs). */
function loadPreview(id: string) {
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

function PreviewCard({ place, sticky }: { place: RestaurantMarker; sticky: boolean }) {
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
function GroupList({ places }: { places: RestaurantMarker[] }) {
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

// ---------- Map ----------

export default function Map({
  restaurants,
  center,
  zoom = 12,
  onMapClick,
  selected,
  scrollWheelZoom = true,
}: MapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [popup, setPopup] = useState<(PopupState & { at: [number, number] }) | null>(
    null,
  );
  // Popup content is React, rendered into this node through a portal.
  const [popupNode] = useState(() => document.createElement("div"));
  const popupRef = useRef<Popup | null>(null);

  const groups = useMemo(() => groupByLocation(restaurants), [restaurants]);

  // Latest callbacks for listeners registered once.
  const onMapClickRef = useRef(onMapClick);
  const groupsRef = useRef(groups);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
    groupsRef.current = groups;
  });

  // ----- Create the map once -----
  useEffect(() => {
    const first = restaurants[0];
    const map = new MapLibreMap({
      container: containerRef.current!,
      style: STYLE_URL,
      center: center
        ? [center[1], center[0]]
        : first
          ? [first.lng, first.lat]
          : [DEFAULT_CENTER[1], DEFAULT_CENTER[0]],
      zoom,
      scrollZoom: scrollWheelZoom,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-left");
    map.on("click", (event) => onMapClickRef.current?.(event.lngLat.lat, event.lngLat.lng));
    map.on("load", () => setReady(true));
    mapRef.current = map;

    // Fit every pin in view on first render (not afterwards: don't fight panning).
    if (!center && restaurants.length > 1) {
      const bounds = new LngLatBounds();
      for (const place of restaurants) bounds.extend([place.lng, place.lat]);
      map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
    }

    const popupInstance = new Popup({ offset: 34, maxWidth: "none" }).setDOMContent(
      popupNode,
    );
    popupInstance.on("close", () => setPopup(null));
    popupRef.current = popupInstance;

    return () => {
      popupInstance.remove();
      map.remove();
      mapRef.current = null;
    };
    // Created once: later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Places: clustered source + HTML pins kept in sync with it -----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const data = toGeoJSON(groups);
    const existing = map.getSource<GeoJSONSource>("places");
    if (existing) {
      existing.setData(data);
      return;
    }

    map.addSource("places", {
      type: "geojson",
      data,
      cluster: true,
      clusterRadius: 48,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterProperties: {
        total: ["+", ["get", "total"]],
        visited: ["+", ["get", "visited"]],
      },
    });
    // Invisible layer: the source only computes clusters for rendered layers.
    map.addLayer({
      id: "places-anchor",
      type: "circle",
      source: "places",
      paint: { "circle-radius": 0, "circle-opacity": 0 },
    });

    const markers = new globalThis.Map<string, Marker>();

    function openPopup(state: PopupState, at: [number, number]) {
      setPopup({ ...state, at });
    }

    function createMarker(id: string, properties: Record<string, unknown>, at: [number, number]) {
      if (properties.cluster) {
        const element = clusterElement(
          Number(properties.total),
          colorFor(Number(properties.visited), Number(properties.total)),
        );
        element.addEventListener("click", async (event) => {
          event.stopPropagation();
          const source = map!.getSource<GeoJSONSource>("places");
          const zoomTo = await source?.getClusterExpansionZoom(Number(properties.cluster_id));
          map!.easeTo({ center: at, zoom: (zoomTo ?? map!.getZoom() + 2) + 0.5 });
        });
        return new Marker({ element }).setLngLat(at);
      }

      const places = groupsRef.current.get(String(properties.key)) ?? [];
      if (places.length > 1) {
        const element = pinElement(
          colorFor(Number(properties.visited), places.length),
          `<b>${places.length}</b>`,
          `${places[0].name} +${places.length - 1}`,
        );
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          openPopup({ kind: "group", places }, at);
        });
        return new Marker({ element, anchor: "bottom" }).setLngLat(at);
      }

      const [place] = places;
      const element = pinElement(
        place.status === "VISITED" ? VISITED_COLOR : PENDING_COLOR,
        place.icon,
        place.name,
      );
      if (CAN_HOVER) {
        element.addEventListener("mouseenter", () => {
          void loadPreview(place.id);
          openPopup({ kind: "preview", place, sticky: false }, at);
        });
        element.addEventListener("mouseleave", () =>
          setPopup((current) =>
            current?.kind === "preview" && !current.sticky ? null : current,
          ),
        );
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          router.push(`/lugares/${place.id}`);
        });
      } else {
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          openPopup({ kind: "preview", place, sticky: true }, at);
        });
      }
      return new Marker({ element, anchor: "bottom" }).setLngLat(at);
    }

    function sync() {
      if (!map!.isSourceLoaded("places")) return;
      const seen = new Set<string>();
      for (const feature of map!.querySourceFeatures("places")) {
        const properties = feature.properties;
        const id = properties.cluster
          ? `cluster-${properties.cluster_id}`
          : `pin-${properties.key}`;
        // A feature can come back once per tile it touches.
        if (seen.has(id)) continue;
        seen.add(id);
        if (!markers.has(id) && feature.geometry.type === "Point") {
          const at = feature.geometry.coordinates as [number, number];
          markers.set(id, createMarker(id, properties, at).addTo(map!));
        }
      }
      for (const [id, marker] of markers) {
        if (!seen.has(id)) {
          marker.remove();
          markers.delete(id);
        }
      }
    }

    map.on("render", sync);
    map.on("sourcedata", (event) => {
      // New data (filter changed): rebuild every pin from scratch.
      if (event.sourceId === "places" && event.sourceDataType === "content") {
        for (const marker of markers.values()) marker.remove();
        markers.clear();
      }
    });
  }, [groups, ready, router]);

  // ----- Popup: position it and render its React content -----
  useEffect(() => {
    const map = mapRef.current;
    const instance = popupRef.current;
    if (!map || !instance) return;
    if (!popup) {
      if (instance.isOpen()) instance.remove();
      return;
    }
    const closeButton = popup.kind === "group" || popup.sticky;
    if (instance.options.closeButton !== closeButton) {
      instance.options.closeButton = closeButton;
      // The close button is built when the content is set.
      instance.setDOMContent(popupNode);
    }
    instance.setLngLat(popup.at);
    if (!instance.isOpen()) instance.addTo(map);
  }, [popup, popupNode]);

  // ----- Selected point (location picker) -----
  const selectedRef = useRef<Marker | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selected) {
      selectedRef.current?.remove();
      selectedRef.current = null;
      return;
    }
    const at: [number, number] = [selected.lng, selected.lat];
    if (!selectedRef.current) {
      selectedRef.current = new Marker({
        element: pinElement(MIXED_COLOR, ""),
        anchor: "bottom",
      }).addTo(map);
    }
    selectedRef.current.setLngLat(at);
    // Bring it into view when it's off-screen (e.g. after an address search).
    if (!map.getBounds().contains(at)) {
      map.jumpTo({ center: at, zoom: Math.max(map.getZoom(), 15) });
    }
  }, [selected]);

  let popupContent: ReactNode = null;
  if (popup?.kind === "preview") {
    popupContent = <PreviewCard place={popup.place} sticky={popup.sticky} />;
  } else if (popup?.kind === "group") {
    popupContent = <GroupList places={popup.places} />;
  }

  return (
    <>
      <div ref={containerRef} className="h-full w-full" />
      {createPortal(popupContent, popupNode)}
    </>
  );
}
