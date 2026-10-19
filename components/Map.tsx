"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import "./leaflet-overrides.css";
import { formatShortDate } from "@/lib/format";
import type { RestaurantMarker } from "@/lib/types";

const PIN_SIZE = 30;

const PIN_HTML = (color: string, icon?: string) => `<span style="
      display:grid;place-items:center;
      width:${PIN_SIZE}px;height:${PIN_SIZE}px;
      border-radius:50% 50% 50% 0;
      background:${color};
      border:3px solid white;
      box-shadow:0 2px 6px rgba(28,25,23,0.35);
      transform:rotate(-45deg);
    ">${icon ? `<span style="transform:rotate(45deg);font-size:13px;line-height:1">${icon}</span>` : ""}</span>`;

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}

function pinIcon(color: string, label?: string, icon?: string) {
  return L.divIcon({
    className: "",
    html:
      PIN_HTML(color, icon) +
      (label ? `<span class="map-pin-label">${escapeHtml(label)}</span>` : ""),
    iconSize: [PIN_SIZE, PIN_SIZE],
    iconAnchor: [PIN_SIZE / 2, PIN_SIZE],
    popupAnchor: [0, -PIN_SIZE],
    tooltipAnchor: [0, -PIN_SIZE - 4],
  });
}

const VISITED_COLOR = "#059669";
const PENDING_COLOR = "#f59e0b";
/** A group mixing visited and pending places. */
const MIXED_COLOR = "#0d857b";

/** Places closer than ~1 m share a pin (e.g. two events at the same venue). */
function locationKey({ lat, lng }: { lat: number; lng: number }) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function groupByLocation(restaurants: RestaurantMarker[]) {
  const groups = new globalThis.Map<string, RestaurantMarker[]>();
  for (const restaurant of restaurants) {
    const key = locationKey(restaurant);
    groups.set(key, [...(groups.get(key) ?? []), restaurant]);
  }
  return [...groups.entries()].map(([key, places]) => ({ key, places }));
}

function groupIcon(places: RestaurantMarker[]) {
  const visited = places.filter((p) => p.status === "VISITED").length;
  const color =
    visited === places.length
      ? VISITED_COLOR
      : visited === 0
        ? PENDING_COLOR
        : MIXED_COLOR;
  return pinIcon(
    color,
    `${places[0].name} +${places.length - 1}`,
    `<b style="font-size:12px">${places.length}</b>`,
  );
}

/** Both visit photos side by side; used in the hover tooltip and the popup. */
function VisitPhotos({ restaurant }: { restaurant: RestaurantMarker }) {
  const photos = [
    { url: restaurant.coverUrl, alt: `Foto en ${restaurant.name}` },
    { url: restaurant.placeUrl, alt: `El lugar: ${restaurant.name}` },
  ].filter((photo): photo is { url: string; alt: string } =>
    Boolean(photo.url),
  );
  if (photos.length === 0) return null;

  return (
    <div className="flex h-40 gap-1 overflow-hidden rounded-lg bg-stone-100">
      {photos.map((photo) => (
        // Signed Supabase URLs inside a Leaflet overlay: a plain <img> is simplest.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={photo.url}
          src={photo.url}
          alt={photo.alt}
          className="h-full min-w-0 flex-1 object-cover"
        />
      ))}
    </div>
  );
}

/** Date, visit count and text of the latest visit. */
function LatestVisit({ restaurant }: { restaurant: RestaurantMarker }) {
  if (!restaurant.lastVisitText || !restaurant.date) return null;
  const count = restaurant.visitCount ?? 1;

  return (
    <>
      <p className="text-xs text-stone-500">
        🗓 {formatShortDate(restaurant.date)}
        {count > 1 && ` · 🔁 Fueron ${count} veces`}
      </p>
      <p className="line-clamp-2 text-xs text-stone-600">
        {restaurant.lastVisitText}
      </p>
    </>
  );
}

const SELECTED_ICON = pinIcon("#0d857b");

// This module only loads in the browser (MapLoader uses ssr: false).
// With a mouse: hover previews the photos and a click opens the place.
// On touch screens there's no hover, so a tap opens a popup instead.
const CAN_HOVER = window.matchMedia("(hover: hover)").matches;

type MapProps = {
  restaurants: RestaurantMarker[];
  center?: [number, number];
  zoom?: number;
  onMapClick?: (lat: number, lng: number) => void;
  selected?: { lat: number; lng: number } | null;
  scrollWheelZoom?: boolean;
};

function ClickListener({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Brings the selected point into view when it's off-screen (e.g. after an address search). */
function FollowSelected({
  selected,
}: {
  selected: { lat: number; lng: number };
}) {
  const map = useMap();
  useEffect(() => {
    if (map.getBounds().contains([selected.lat, selected.lng])) return;
    map.setView([selected.lat, selected.lng], Math.max(map.getZoom(), 15));
  }, [map, selected.lat, selected.lng]);
  return null;
}

/** Fits every marker in view on first render. */
function FitMarkers({ restaurants }: { restaurants: RestaurantMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (restaurants.length < 2) return;
    map.fitBounds(L.latLngBounds(restaurants.map((r) => [r.lat, r.lng])), {
      padding: [48, 48],
      maxZoom: 15,
    });
    // Only on mount: don't fight the user's panning afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816];

export default function Map({
  restaurants,
  center,
  zoom = 12,
  onMapClick,
  selected,
  scrollWheelZoom = true,
}: MapProps) {
  const router = useRouter();
  const groups = useMemo(
    () =>
      groupByLocation(restaurants).map(({ key, places }) => ({
        key,
        places,
        icon:
          places.length === 1
            ? pinIcon(
                places[0].status === "VISITED" ? VISITED_COLOR : PENDING_COLOR,
                places[0].name,
                places[0].icon,
              )
            : groupIcon(places),
      })),
    [restaurants],
  );

  const [initialCenter] = useState<[number, number]>(
    center ??
      (restaurants[0]
        ? [restaurants[0].lat, restaurants[0].lng]
        : DEFAULT_CENTER),
  );

  return (
    <MapContainer
      center={initialCenter}
      zoom={zoom}
      scrollWheelZoom={scrollWheelZoom}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onMapClick && <ClickListener onMapClick={onMapClick} />}
      {!center && <FitMarkers restaurants={restaurants} />}
      {selected && (
        <>
          <Marker
            position={[selected.lat, selected.lng]}
            icon={SELECTED_ICON}
          />
          <FollowSelected selected={selected} />
        </>
      )}
      {groups.map(({ key, places, icon }) => {
        if (places.length > 1) {
          return <GroupMarker key={key} places={places} icon={icon} />;
        }
        const [restaurant] = places;
        return (
          <Marker
            key={key}
            position={[restaurant.lat, restaurant.lng]}
            icon={icon}
            eventHandlers={
              CAN_HOVER
                ? { click: () => router.push(`/lugares/${restaurant.id}`) }
                : undefined
            }
          >
            {CAN_HOVER &&
              (restaurant.coverUrl ||
                restaurant.placeUrl ||
                restaurant.lastVisitText) && (
                <Tooltip direction="top" className="photo-tooltip" opacity={1}>
                  <div className="flex w-64 flex-col gap-2">
                    <VisitPhotos restaurant={restaurant} />
                    <div className="flex flex-col gap-0.5 px-1">
                      <p className="text-sm font-semibold text-stone-900">
                        {restaurant.name}
                      </p>
                      <LatestVisit restaurant={restaurant} />
                    </div>
                  </div>
                </Tooltip>
              )}
            {!CAN_HOVER && (
              <Popup>
                <div className="flex w-56 flex-col gap-1.5">
                  <VisitPhotos restaurant={restaurant} />
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${
                        restaurant.status === "VISITED"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {restaurant.status === "VISITED"
                        ? "Visitado"
                        : "Pendiente"}
                    </span>
                    <span className="text-xs text-stone-500">
                      {restaurant.icon} {restaurant.typeLabel}
                    </span>
                  </span>
                  <p className="text-base font-semibold text-stone-900">
                    {restaurant.name}
                  </p>
                  <LatestVisit restaurant={restaurant} />
                  {restaurant.address && (
                    <p className="text-sm text-stone-500">
                      {restaurant.address}
                    </p>
                  )}
                  <Link
                    href={`/lugares/${restaurant.id}`}
                    className="link mt-1 text-sm"
                  >
                    Ver detalle →
                  </Link>
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}
    </MapContainer>
  );
}

/** One pin for several places at the same spot; tapping it lists them all. */
function GroupMarker({
  places,
  icon,
}: {
  places: RestaurantMarker[];
  icon: L.DivIcon;
}) {
  return (
    <Marker position={[places[0].lat, places[0].lng]} icon={icon}>
      <Popup>
        <div className="flex w-60 flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
            {places.length} en este lugar
          </p>
          {places[0].address && (
            <p className="-mt-1 truncate text-xs text-stone-500">
              {places[0].address}
            </p>
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
                    {place.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={place.coverUrl}
                        alt=""
                        className="size-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-lg bg-stone-100 text-lg"
                        aria-hidden
                      >
                        {place.icon}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold">
                        {place.name}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-stone-500">
                        <span
                          className="size-2 rounded-full"
                          style={{
                            background:
                              place.status === "VISITED"
                                ? VISITED_COLOR
                                : PENDING_COLOR,
                          }}
                        />
                        {place.status === "VISITED" ? "Visitado" : "Pendiente"}{" "}
                        · {place.icon} {place.typeLabel}
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
      </Popup>
    </Marker>
  );
}
