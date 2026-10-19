const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

/** Vercel rejects request bodies over 4.5 MB; keep a margin for form overhead. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Downscales a photo in the browser so phone pictures (often 3–8 MB) upload
 * fast and stay well under the server action body limit. Returns the original
 * file when it isn't a still image or can't be decoded.
 */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Compresses the form's images and checks the total fits in one request.
 * Returns an error message instead when there are too many photos at once.
 */
export async function prepareUpload(
  formData: FormData,
): Promise<{ formData: FormData } | { error: string }> {
  const compressed = await compressFormImages(formData);
  let total = 0;
  for (const value of compressed.values()) {
    total += value instanceof File ? value.size : value.length;
  }
  if (total > MAX_UPLOAD_BYTES) {
    return {
      error:
        "Son demasiadas fotos para subir de una vez. Probá con menos; después podés sumar más desde \"+ Agregar fotos\".",
    };
  }
  return { formData: compressed };
}

/**
 * Copies a FormData compressing every non-empty image. Entry order is kept,
 * including empty file inputs, because repeated fields (e.g. dishes) are
 * matched by position on the server.
 */
async function compressFormImages(formData: FormData) {
  const result = new FormData();
  for (const [key, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) {
      result.append(key, await compressImage(value));
    } else {
      result.append(key, value);
    }
  }
  return result;
}
