"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import type { MapProps } from "@/components/Map";

function Loading() {
  return (
    <div className="flex h-full w-full animate-pulse items-center justify-center bg-stone-100 text-sm text-stone-500">
      Cargando mapa...
    </div>
  );
}

// Browser-only (they touch window): loaded once the browser is known.
const VectorMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: Loading,
});
const RasterMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: Loading,
});

let webGL2: boolean | undefined;

/** MapLibre draws with WebGL2; some browsers don't have it (or have it off). */
function supportsWebGL2() {
  if (webGL2 === undefined) {
    try {
      webGL2 = Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      webGL2 = false;
    }
  }
  return webGL2;
}

const noSubscription = () => () => {};

/**
 * The map: vector (MapLibre) when the browser can draw it, otherwise the
 * Leaflet fallback. Also falls back if MapLibre fails to start anyway.
 */
export default function MapLoader(props: MapProps) {
  const canUseWebGL2 = useSyncExternalStore(
    noSubscription,
    supportsWebGL2,
    () => null,
  );
  const [failed, setFailed] = useState(false);

  if (canUseWebGL2 === null) return <Loading />;
  if (!canUseWebGL2 || failed) return <RasterMap {...props} />;
  return <VectorMap {...props} onUnsupported={() => setFailed(true)} />;
}
