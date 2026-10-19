"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export type LightboxPhoto = { id: number; url: string };

/**
 * Open/delete state for a gallery: `view(index)` opens the viewer, and
 * `lightbox` is the element to render (null while closed).
 */
export function usePhotoViewer({
  photos,
  title,
  onDelete,
}: {
  photos: LightboxPhoto[];
  title: string;
  /** Server action that removes one photo by id. */
  onDelete: (photoId: number) => Promise<void>;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isDeleting, startDelete] = useTransition();

  function remove(photo: LightboxPhoto) {
    if (!window.confirm("¿Eliminar esta foto?")) return;
    startDelete(async () => {
      await onDelete(photo.id);
      setOpenIndex(null);
    });
  }

  const lightbox =
    openIndex !== null && photos[openIndex] ? (
      <Lightbox
        photos={photos}
        index={openIndex}
        title={title}
        onIndexChange={setOpenIndex}
        onClose={() => setOpenIndex(null)}
        onDelete={remove}
        isDeleting={isDeleting}
      />
    ) : null;

  return { view: setOpenIndex, lightbox };
}

/** Full-screen photo viewer with arrows and a strip of thumbnails. */
export function Lightbox({
  photos,
  index,
  title,
  onIndexChange,
  onClose,
  onDelete,
  isDeleting,
}: {
  photos: LightboxPhoto[];
  index: number;
  title: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onDelete: (photo: LightboxPhoto) => void;
  isDeleting: boolean;
}) {
  const photo = photos[index];
  const stripRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (step: number) =>
      onIndexChange((index + step + photos.length) % photos.length),
    [index, photos.length, onIndexChange],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    }
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, onClose]);

  // Keep the current thumbnail in view.
  useEffect(() => {
    const thumb = stripRef.current?.children[index] as HTMLElement | undefined;
    thumb?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [index]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — foto ${index + 1} de ${photos.length}`}
      className="fixed inset-0 z-[2000] flex flex-col bg-stone-950/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-white/80"
        onClick={(event) => event.stopPropagation()}
      >
        <span>
          {index + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDelete(photo)}
            disabled={isDeleting}
            className="cursor-pointer rounded-lg px-3 py-1.5 font-medium text-red-300 transition hover:bg-white/10 hover:text-red-200 disabled:opacity-60"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-9 cursor-pointer place-items-center rounded-full text-xl text-white transition hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Image
          key={photo.id}
          src={photo.url}
          alt={`${title} — foto ${index + 1}`}
          fill
          className="slide-in object-contain"
          sizes="100vw"
          onClick={(event) => event.stopPropagation()}
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={(event) => {
                event.stopPropagation();
                go(-1);
              }}
              className="absolute top-1/2 left-2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/15 text-2xl text-white transition hover:bg-white/25"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={(event) => {
                event.stopPropagation();
                go(1);
              }}
              className="absolute top-1/2 right-2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/15 text-2xl text-white transition hover:bg-white/25"
            >
              ›
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div
          ref={stripRef}
          className="flex shrink-0 gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]"
          onClick={(event) => event.stopPropagation()}
        >
          {photos.map((thumb, thumbIndex) => (
            <button
              key={thumb.id}
              type="button"
              onClick={() => onIndexChange(thumbIndex)}
              aria-label={`Ver foto ${thumbIndex + 1}`}
              className={`relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-lg transition ${
                thumbIndex === index
                  ? "opacity-100 ring-2 ring-white"
                  : "opacity-40 hover:opacity-80"
              }`}
            >
              <Image
                src={thumb.url}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
