"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full animate-pulse items-center justify-center bg-stone-100 text-sm text-stone-500">
      Cargando mapa...
    </div>
  ),
});

export default Map;
