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
import { KINDS } from "@/lib/places";
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
  const icons = useMemo(
    () =>
      new globalThis.Map(
        restaurants.map((r) => [
          r.id,
          pinIcon(
            r.status === "VISITED" ? "#059669" : "#f59e0b",
            r.name,
            KINDS[r.kind].icon,
          ),
        ]),
      ),
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
      {restaurants.map((restaurant) => (
        <Marker
          key={restaurant.id}
          position={[restaurant.lat, restaurant.lng]}
          icon={icons.get(restaurant.id)}
          eventHandlers={
            CAN_HOVER
              ? { click: () => router.push(`/lugares/${restaurant.id}`) }
              : undefined
          }
        >
          {CAN_HOVER && (restaurant.coverUrl || restaurant.placeUrl) && (
            <Tooltip direction="top" className="photo-tooltip" opacity={1}>
              <div className="flex w-64 flex-col gap-2">
                <VisitPhotos restaurant={restaurant} />
                <p className="px-1 text-sm font-semibold text-stone-900">
                  {restaurant.name}
                </p>
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
                    {restaurant.status === "VISITED" ? "Visitado" : "Pendiente"}
                  </span>
                  <span className="text-xs text-stone-500">
                    {KINDS[restaurant.kind].icon} {KINDS[restaurant.kind].label}
                  </span>
                </span>
                <p className="text-base font-semibold text-stone-900">
                  {restaurant.name}
                </p>
                {restaurant.address && (
                  <p className="text-sm text-stone-500">{restaurant.address}</p>
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
      ))}
    </MapContainer>
  );
}
