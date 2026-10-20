"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { usePhotoViewer, type LightboxPhoto } from "@/components/Lightbox";
import { ShowMore } from "@/components/PhotoGallery";

/** Polaroids shown before "ver más". */
const PREVIEW = 15;

// Small fixed turns per photo so the page looks hand-assembled, not random
// on every render.
const TILTS = [-3, 2, -1.5, 3, -2.5, 1, -1, 2.5];

// Washi tape colors, cycled.
const TAPES = [
  "bg-brand-200/70",
  "bg-amber-200/70",
  "bg-rose-200/70",
  "bg-sky-200/70",
];

type TripAlbumProps = {
  photos: LightboxPhoto[];
  title: string;
  /** Shown under the album title, e.g. the trip's dates. */
  subtitle?: string;
  /** Server action that removes one photo by id. */
  onDelete?: (photoId: number) => Promise<void>;
};

/**
 * Trip photos as a scrapbook: polaroids taped onto a dotted page, each at
 * its real shape and slightly turned. They straighten up on hover.
 */
export function TripAlbum({
  photos,
  title,
  subtitle,
  onDelete,
}: TripAlbumProps) {
  const [showAll, setShowAll] = useState(false);
  const { view, lightbox } = usePhotoViewer({ photos, title, onDelete });

  const visible = showAll ? photos : photos.slice(0, PREVIEW);
  const hidden = photos.length - visible.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl border border-amber-900/10 bg-[#f6efe2] bg-[radial-gradient(#e2d5bc_1px,transparent_1px)] [background-size:18px_18px] px-3 pt-6 pb-4 shadow-inner sm:px-6 sm:pt-8">
        <div className="mb-6 text-center">
          <p className="font-hand text-4xl leading-none text-stone-800 sm:text-5xl">
            {title}
          </p>
          {subtitle && (
            <p className="font-hand mt-1 text-xl text-stone-500">{subtitle}</p>
          )}
        </div>

        <div className="columns-2 gap-4 sm:columns-3 sm:gap-6">
          {visible.map((photo, index) => (
            <div
              key={photo.id}
              className="pin-drop mb-5 break-inside-avoid sm:mb-7"
            >
              <button
                type="button"
                onClick={() => view(index)}
                style={
                  {
                    "--tilt": `${TILTS[index % TILTS.length]}deg`,
                  } as CSSProperties
                }
                className="relative block w-full cursor-zoom-in bg-white [rotate:var(--tilt)] p-2 pb-8 shadow-[0_6px_16px_-6px_rgb(0_0_0/0.35)] transition duration-300 hover:z-10 hover:scale-[1.04] hover:shadow-[0_18px_32px_-10px_rgb(0_0_0/0.4)] hover:[rotate:0deg] sm:p-2.5 sm:pb-10"
              >
                <span
                  aria-hidden
                  className={`absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 -rotate-3 shadow-sm ${
                    TAPES[index % TAPES.length]
                  }`}
                />
                {/* Nominal size until it loads; then the real shape wins. */}
                <Image
                  src={photo.url}
                  alt={`${title} — foto ${index + 1}`}
                  width={600}
                  height={800}
                  preload={index < 2}
                  style={{ width: "100%", height: "auto" }}
                  sizes="(max-width: 640px) 45vw, 230px"
                />
                <span className="font-hand absolute right-3 bottom-1 text-lg text-stone-500 sm:bottom-2 sm:text-xl">
                  nº {index + 1}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {hidden > 0 && (
        <ShowMore hidden={hidden} onClick={() => setShowAll(true)} />
      )}

      {lightbox}
    </div>
  );
}
