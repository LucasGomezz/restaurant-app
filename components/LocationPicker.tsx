"use client";

import { useState, useTransition } from "react";
import MapLoader from "@/components/MapLoader";

type GeocodeResult = { displayName: string; lat: number; lng: number };

type Position = { lat: number; lng: number };

type LocationPickerProps = {
  initial?: Position;
  initialAddress?: string;
  /** Fired whenever a location is chosen, via search or map click. */
  onLocationChange: (value: Position) => void;
  /** Fired only when a search result is picked, to prefill the address field. */
  onAddressFound?: (address: string) => void;
};

export function LocationPicker({
  initial,
  initialAddress,
  onLocationChange,
  onAddressFound,
}: LocationPickerProps) {
  const [query, setQuery] = useState(initialAddress ?? "");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [position, setPosition] = useState<Position | null>(initial ?? null);
  const [isPending, startTransition] = useTransition();

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
          setSearchError("No encontramos esa dirección. Probá con otra o tocá el mapa.");
        }
      } catch {
        setResults([]);
        setSearchError("No se pudo buscar la dirección.");
      }
    });
  }

  function selectResult(result: GeocodeResult) {
    setPosition({ lat: result.lat, lng: result.lng });
    setQuery(result.displayName);
    setResults([]);
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
            onChange={(event) => setQuery(event.target.value)}
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
