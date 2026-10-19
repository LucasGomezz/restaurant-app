"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/** Show the whole photo when filling the frame would crop more than this. */
const MAX_CROP = 0.35;

type AdaptiveImageProps = Omit<ImageProps, "fill" | "onLoad"> & {
  src: string;
};

/**
 * A `fill` image that normally covers its frame, but switches to showing the
 * whole photo over a blurred copy of itself when the shapes differ too much
 * (e.g. a horizontal photo in a vertical frame). Must sit inside a positioned
 * element with a size, like any `fill` image.
 */
export function AdaptiveImage({
  className = "",
  alt,
  ...props
}: AdaptiveImageProps) {
  const [fit, setFit] = useState<"cover" | "contain">("cover");

  function handleLoad(image: HTMLImageElement) {
    const frame = image.parentElement;
    if (!frame || !image.naturalWidth || !image.naturalHeight) return;
    const frameRatio = frame.clientWidth / frame.clientHeight;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    // Share of the photo that "cover" would cut off, whichever side is longer.
    const crop =
      imageRatio > frameRatio
        ? 1 - frameRatio / imageRatio
        : 1 - imageRatio / frameRatio;
    setFit(crop > MAX_CROP ? "contain" : "cover");
  }

  // Strip object-fit utilities the caller passed; the fit is decided here.
  const base = className.replace(/\bobject-(cover|contain)\b/g, "").trim();

  return (
    <>
      {fit === "contain" && (
        <Image
          {...props}
          alt=""
          aria-hidden
          fill
          className="scale-110 object-cover opacity-70 blur-xl"
        />
      )}
      <Image
        {...props}
        alt={alt}
        fill
        onLoad={(event) => handleLoad(event.currentTarget)}
        className={`${base} ${fit === "contain" ? "object-contain" : "object-cover"}`}
      />
    </>
  );
}
