"use client";

import Image from "next/image";
import { useState } from "react";
import { usePhotoViewer, type LightboxPhoto } from "@/components/Lightbox";

/** Photos in the featured mosaic (one big, four small). */
const MOSAIC_SIZE = 5;
/** Wall photos shown before "ver más". */
const WALL_PREVIEW = 12;

type PhotoGalleryProps = {
  photos: LightboxPhoto[];
  title: string;
  /** Server action that removes one photo by id. */
  onDelete?: (photoId: number) => Promise<void>;
};

/**
 * A visit's photos: a featured mosaic with the first ones (when there are
 * enough) and a wall with the rest at their real shape.
 */
export function PhotoGallery({ photos, title, onDelete }: PhotoGalleryProps) {
  const [showAll, setShowAll] = useState(false);
  const { view, lightbox } = usePhotoViewer({ photos, title, onDelete });

  const mosaic =
    photos.length >= MOSAIC_SIZE ? photos.slice(0, MOSAIC_SIZE) : [];
  const wall = photos.slice(mosaic.length);
  const visibleWall = showAll ? wall : wall.slice(0, WALL_PREVIEW);
  const hidden = wall.length - visibleWall.length;
  const label = (index: number) => `${title} — foto ${index + 1}`;

  return (
    <div className="flex flex-col gap-3">
      {mosaic.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-2xl sm:aspect-[2/1] sm:grid-cols-4 sm:grid-rows-2">
          {mosaic.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => view(index)}
              className={`group relative cursor-zoom-in overflow-hidden bg-stone-100 ${
                index === 0
                  ? "col-span-2 aspect-[4/3] sm:row-span-2 sm:aspect-auto"
                  : "aspect-square sm:aspect-auto"
              }`}
            >
              <Image
                src={photo.url}
                alt={label(index)}
                fill
                preload={index === 0}
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes={
                  index === 0
                    ? "(max-width: 640px) 100vw, 384px"
                    : "(max-width: 640px) 50vw, 192px"
                }
              />
            </button>
          ))}
        </div>
      )}

      {visibleWall.length > 0 && (
        <div className="columns-2 gap-3 sm:columns-3">
          {visibleWall.map((photo, offset) => {
            const index = mosaic.length + offset;
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => view(index)}
                className="reveal group relative mb-3 block w-full cursor-zoom-in break-inside-avoid overflow-hidden rounded-xl bg-stone-100"
              >
                {/* Nominal size until it loads; then the real shape wins. */}
                <Image
                  src={photo.url}
                  alt={label(index)}
                  width={600}
                  height={800}
                  style={{ width: "100%", height: "auto" }}
                  className="transition duration-700 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 240px"
                />
              </button>
            );
          })}
        </div>
      )}

      {hidden > 0 && (
        <ShowMore hidden={hidden} onClick={() => setShowAll(true)} />
      )}

      {lightbox}
    </div>
  );
}

export function ShowMore({
  hidden,
  onClick,
}: {
  hidden: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-secondary self-center"
    >
      Ver {hidden === 1 ? "la foto restante" : `las ${hidden} fotos restantes`}
    </button>
  );
}
