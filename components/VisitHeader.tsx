"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** `ratio` (width / height) is known from upload; otherwise measured on load. */
type Photo = { src: string; alt: string; ratio?: number | null };

/** Most photos are vertical phone shots; assumed until the real size loads. */
const DEFAULT_RATIO = 9 / 16;
const ROW_GAP = 4;
/** Cap for the photo row so a single vertical photo doesn't fill the screen. */
const MAX_ROW_HEIGHT = 560;

/**
 * Card header for a place: its photos plus the text column (`children`).
 * Frames follow each photo's real shape, so nothing gets cropped:
 * - one vertical couple photo → beside the text, as a tall column;
 * - otherwise (two photos, or a horizontal / place-only one) → a row on top
 *   where every photo has the same height and its own natural width;
 * - except two vertical photos, which stretch to fill the whole row.
 */
export function VisitHeader({
  cover,
  place,
  children,
}: {
  cover: Photo | null;
  place: Photo | null;
  children: ReactNode;
}) {
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const ratioOf = (photo: Photo) =>
    ratios[photo.src] ?? photo.ratio ?? DEFAULT_RATIO;
  const onRatio = (src: string, ratio: number) =>
    setRatios((current) =>
      current[src] === ratio ? current : { ...current, [src]: ratio },
    );

  const photos = [cover, place].filter((p): p is Photo => Boolean(p));
  const besideText =
    photos.length === 1 && cover !== null && ratioOf(cover) <= 1;

  if (photos.length === 0) {
    return <section className="card overflow-hidden">{children}</section>;
  }

  if (besideText && cover) {
    return (
      <section className="card overflow-hidden sm:flex">
        <div
          className="relative w-full shrink-0 bg-stone-100 sm:w-64 md:w-72"
          style={{ aspectRatio: ratioOf(cover) }}
        >
          <MeasuredImage
            photo={cover}
            onRatio={onRatio}
            sizes="(max-width: 640px) 100vw, 288px"
          />
        </div>
        {children}
      </section>
    );
  }

  return (
    <section className="card overflow-hidden">
      <PhotoRow photos={photos} ratioOf={ratioOf} onRatio={onRatio} />
      {children}
    </section>
  );
}

/** Photos side by side at one shared height, each at its natural width. */
function PhotoRow({
  photos,
  ratioOf,
  onRatio,
}: {
  photos: Photo[];
  ratioOf: (photo: Photo) => number;
  onRatio: (src: string, ratio: number) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  const totalRatio = photos.reduce((sum, photo) => sum + ratioOf(photo), 0);
  const gaps = ROW_GAP * (photos.length - 1);
  const height = width
    ? Math.min(MAX_ROW_HEIGHT, (width - gaps) / totalRatio)
    : 0;
  // Two vertical photos fill the row instead of leaving blurred sides; when
  // the height cap kicks in they get a slight crop top and bottom.
  const fillRow =
    photos.length > 1 && photos.every((photo) => ratioOf(photo) <= 1);
  const widthOf = (ratio: number) =>
    fillRow ? ((width - gaps) * ratio) / totalRatio : ratio * height;

  return (
    <div
      ref={rowRef}
      className="relative flex justify-center overflow-hidden bg-stone-100"
      style={{ gap: ROW_GAP }}
    >
      {/* When the row is narrower than the card, blur fills the sides. */}
      {!fillRow && (
        <Image
          src={photos[0].src}
          alt=""
          aria-hidden
          fill
          className="scale-110 object-cover opacity-60 blur-2xl"
          sizes="64px"
        />
      )}
      {photos.map((photo) => {
        const ratio = ratioOf(photo);
        return (
          <div
            key={photo.src}
            className="relative shrink-0"
            // Before the row is measured, flex by ratio (same idea, no cap).
            style={
              height
                ? { width: widthOf(ratio), height }
                : { flex: `${ratio} 1 0%`, aspectRatio: ratio }
            }
          >
            <MeasuredImage
              photo={photo}
              onRatio={onRatio}
              sizes={`(max-width: 768px) ${Math.round(
                (ratio / totalRatio) * 100,
              )}vw, ${Math.round(ratio * MAX_ROW_HEIGHT)}px`}
            />
          </div>
        );
      })}
    </div>
  );
}

function MeasuredImage({
  photo,
  onRatio,
  sizes,
}: {
  photo: Photo;
  onRatio: (src: string, ratio: number) => void;
  sizes: string;
}) {
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      fill
      priority
      className="object-cover"
      sizes={sizes}
      onLoad={(event) => {
        const image = event.currentTarget;
        if (image.naturalWidth && image.naturalHeight) {
          onRatio(photo.src, image.naturalWidth / image.naturalHeight);
        }
      }}
    />
  );
}
