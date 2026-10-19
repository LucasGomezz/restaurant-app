"use client";

import { useMemo, useState, useTransition } from "react";
import MapLoader from "@/components/MapLoader";

type GeocodeResult = { displayName: string; lat: number; lng: number };

type Position = { lat: number; lng: number };

/** A place already added, offered so a new one can reuse its exact spot. */
export type KnownLocation = Position & { name: string; address: string | null };

type KnownSpot = Position & { address: string | null; names: string[] };

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Places at the same spot (~1 m) become one suggestion. */
function toSpots(locations: KnownLocation[]): KnownSpot[] {
  const spots = new Map<string, KnownSpot>();
  for (const { name, address, lat, lng } of locations) {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const spot = spots.get(key);
    if (spot) {
      spot.names.push(name);
      spot.address ??= address;
    } else {
      spots.set(key, { lat, lng, address, names: [name] });
    }
  }
  return [...spots.values()];
}

type LocationPickerProps = {
  initial?: Position;
  initialAddress?: string;
  /** Fired whenever a location is chosen, via search or map click. */
  onLocationChange: (value: Position) => void;
  /** Fired only when a search result is picked, to prefill the address field. */
  onAddressFound?: (address: string) => void;
  /** Places already added; matching ones are suggested while typing. */
  knownLocations?: KnownLocation[];
};

export function LocationPicker({
  initial,
  initialAddress,
  onLocationChange,
  onAddressFound,
  knownLocations = [],
}: LocationPickerProps) {
  const [query, setQuery] = useState(initialAddress ?? "");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [position, setPosition] = useState<Position | null>(initial ?? null);
  const [isPending, startTransition] = useTransition();
  // Suggestions only while typing, not after picking something.
  const [typing, setTyping] = useState(false);

  const spots = useMemo(() => toSpots(knownLocations), [knownLocations]);
  const term = normalize(query.trim());
  const suggestions =
    typing && term.length >= 2
      ? spots
          .filter((spot) =>
            [...spot.names, spot.address ?? ""].some((text) =>
              normalize(text).includes(term),
            ),
          )
          .slice(0, 4)
      : [];

  function search() {
    if (!query.trim()) return;
    startTransition(async () => {
      setSearchError(null);
      try {
        const response = await fetch(
          `/api/geocode?q=${encodeURIComponent(query)}`,
        );
        const data = await response.json();
        if (!response.ok) {
          setResults([]);
          setSearchError(data.error ?? "No se pudo buscar la dirección.");
          return;
        }
        const found: GeocodeResult[] = data.results ?? [];
        setResults(found);
        if (found.length === 0) {
          setSearchError(
            "No encontramos esa dirección. Probá con otra o tocá el mapa.",
          );
        }
      } catch {
        setResults([]);
        setSearchError("No se pudo buscar la dirección.");
      }
    });
  }

  function selectSpot(spot: KnownSpot) {
    setPosition({ lat: spot.lat, lng: spot.lng });
    setQuery(spot.address ?? spot.names[0]);
    setResults([]);
    setTyping(false);
    onLocationChange({ lat: spot.lat, lng: spot.lng });
    if (spot.address) onAddressFound?.(spot.address);
  }

  function selectResult(result: GeocodeResult) {
    setPosition({ lat: result.lat, lng: result.lng });
    setQuery(result.displayName);
    setResults([]);
    setTyping(false);
    onLocationChange({ lat: result.lat, lng: result.lng });
    onAddressFound?.(result.displayName);
  }

  function handleMapClick(lat: number, lng: number) {
    setPosition({ lat, lng });
    setResults([]);
    onLocationChange({ lat, lng });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="location-search" className="field-label">
          Ubicación
        </label>
        <div className="flex gap-2">
          <input
            id="location-search"
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setTyping(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                search();
              }
            }}
            placeholder="Buscar: Av. Corrientes 1234, CABA"
            className="input flex-1"
          />
          <button
            type="button"
            onClick={search}
            disabled={isPending}
            className="btn-secondary shrink-0"
          >
            {isPending ? "Buscando..." : "Buscar"}
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="card overflow-hidden">
            <p className="bg-stone-50 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Ya cargados
            </p>
            <ul className="flex flex-col divide-y divide-stone-100">
              {suggestions.map((spot) => (
                <li key={`${spot.lat},${spot.lng}`}>
                  <button
                    type="button"
                    onClick={() => selectSpot(spot)}
                    className="flex w-full cursor-pointer flex-col px-3.5 py-2.5 text-left transition hover:bg-brand-50"
                  >
                    <span className="text-sm font-medium text-stone-900">
                      📍 {spot.address ?? spot.names[0]}
                    </span>
                    <span className="truncate text-xs text-stone-500">
                      Usado en: {spot.names.join(", ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {results.length > 0 && (
          <ul className="card flex flex-col divide-y divide-stone-100 overflow-hidden">
            {results.map((result, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => selectResult(result)}
                  className="w-full cursor-pointer px-3.5 py-2.5 text-left text-sm text-stone-700 transition hover:bg-brand-50 hover:text-stone-900"
                >
                  {result.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
        {searchError && <p className="text-sm text-amber-700">{searchError}</p>}
      </div>

      <div className="h-72 w-full overflow-hidden rounded-2xl border border-stone-200 shadow-sm">
        <MapLoader
          restaurants={[]}
          center={position ? [position.lat, position.lng] : undefined}
          zoom={position ? 15 : 12}
          selected={position}
          onMapClick={handleMapClick}
        />
      </div>

      <p className="text-xs text-stone-500">
        {position
          ? `Ubicación marcada: ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}. Tocá el mapa para ajustarla.`
          : "También podés tocar el mapa para marcar la ubicación."}
      </p>
    </div>
  );
}
