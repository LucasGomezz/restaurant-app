"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import "./leaflet-overrides.css";
import "./map.css";
import type { MapProps } from "@/components/Map";
import {
  CAN_HOVER,
  GroupList,
  MIXED_COLOR,
  PENDING_COLOR,
  PreviewCard,
  VISITED_COLOR,
  colorFor,
  groupByLocation,
  loadPreview,
} from "@/components/MapShared";
import type { RestaurantMarker } from "@/lib/types";

/**
 * Fallback for browsers that can't run MapLibre (no WebGL2): the same map on
 * raster OpenStreetMap tiles, without clustering. MapLoader picks it.
 */

const PIN_SIZE = 30;
const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816];

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}

/** Same teardrop pin as the MapLibre map (styles in map.css). */
function pinIcon(color: string, content: string, label?: string) {
  return L.divIcon({
    className: "",
    html:
      `<div class="map-pin"><span class="map-pin-drop" style="background:${color}"><span class="map-pin-icon">${content}</span></span>` +
      (label ? `<span class="map-pin-label">${escapeHtml(label)}</span>` : "") +
      "</div>",
    iconSize: [PIN_SIZE, PIN_SIZE],
    iconAnchor: [PIN_SIZE / 2, PIN_SIZE],
    popupAnchor: [0, -PIN_SIZE],
    tooltipAnchor: [0, -PIN_SIZE - 4],
  });
}

function ClickListener({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

/** Brings the selected point into view when it's off-screen. */
function FollowSelected({ selected }: { selected: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (map.getBounds().contains([selected.lat, selected.lng])) return;
    map.setView([selected.lat, selected.lng], Math.max(map.getZoom(), 15));
  }, [map, selected.lat, selected.lng]);
  return null;
}

/** Fits every pin in view on first render (not afterwards: don't fight panning). */
function FitMarkers({ restaurants }: { restaurants: RestaurantMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (restaurants.length < 2) return;
    map.fitBounds(L.latLngBounds(restaurants.map((r) => [r.lat, r.lng])), {
      padding: [48, 48],
      maxZoom: 15,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

const SELECTED_ICON = pinIcon(MIXED_COLOR, "");

export default function LeafletMap({
  restaurants,
  center,
  zoom = 12,
  onMapClick,
  selected,
  scrollWheelZoom = true,
}: MapProps) {
  const router = useRouter();
  const groups = useMemo(() => [...groupByLocation(restaurants)], [restaurants]);
  const [initialCenter] = useState<[number, number]>(
    center ?? (restaurants[0] ? [restaurants[0].lat, restaurants[0].lng] : DEFAULT_CENTER),
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
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onMapClick && <ClickListener onMapClick={onMapClick} />}
      {!center && <FitMarkers restaurants={restaurants} />}
      {selected && (
        <>
          <Marker position={[selected.lat, selected.lng]} icon={SELECTED_ICON} />
          <FollowSelected selected={selected} />
        </>
      )}
      {groups.map(([key, places]) => {
        const at: [number, number] = [places[0].lat, places[0].lng];
        if (places.length > 1) {
          const visited = places.filter((p) => p.status === "VISITED").length;
          return (
            <Marker
              key={key}
              position={at}
              icon={pinIcon(
                colorFor(visited, places.length),
                `<b>${places.length}</b>`,
                `${places[0].name} +${places.length - 1}`,
              )}
            >
              <Popup>
                <GroupList places={places} />
              </Popup>
            </Marker>
          );
        }

        const [place] = places;
        return (
          <Marker
            key={key}
            position={at}
            icon={pinIcon(
              place.status === "VISITED" ? VISITED_COLOR : PENDING_COLOR,
              place.icon,
              place.name,
            )}
            eventHandlers={
              CAN_HOVER
                ? {
                    mouseover: () => void loadPreview(place.id),
                    click: () => router.push(`/lugares/${place.id}`),
                  }
                : undefined
            }
          >
            {CAN_HOVER ? (
              <Tooltip direction="top" className="photo-tooltip" opacity={1}>
                <PreviewCard place={place} sticky={false} />
              </Tooltip>
            ) : (
              <Popup>
                <PreviewCard place={place} sticky />
              </Popup>
            )}
          </Marker>
        );
      })}
    </MapContainer>
  );
}
