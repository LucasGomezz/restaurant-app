import "server-only";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

export const PHOTOS_BUCKET = "restaurant-photos";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export async function getSignedUrl(
  path: string | null,
): Promise<string | null> {
  if (!path) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) return null;
  return data.signedUrl;
}

export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const supabase = createAdminClient();
  const extension = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (error) {
    throw new Error(`No se pudo subir la imagen: ${error.message}`);
  }

  return path;
}

export async function deletePhotos(paths: (string | null)[]) {
  const validPaths = paths.filter((path): path is string => Boolean(path));
  if (validPaths.length === 0) return;

  const supabase = createAdminClient();
  await supabase.storage.from(PHOTOS_BUCKET).remove(validPaths);
}

export async function getSignedUrls(
  paths: (string | null)[],
): Promise<Map<string, string>> {
  const validPaths = paths.filter((path): path is string => Boolean(path));
  if (validPaths.length === 0) return new Map();

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrls(validPaths, SIGNED_URL_TTL_SECONDS);

  const map = new Map<string, string>();
  if (error || !data) return map;

  for (const entry of data) {
    if (entry.signedUrl && entry.path) {
      map.set(entry.path, entry.signedUrl);
    }
  }
  return map;
}

/**
 * width / height of an image as it is displayed (EXIF rotation applied), so
 * layouts can size frames before the photo loads. Null when unreadable.
 */
export async function imageRatio(
  input: File | ArrayBuffer,
): Promise<number | null> {
  try {
    const bytes = input instanceof File ? await input.arrayBuffer() : input;
    const { width, height, orientation } = await sharp(
      Buffer.from(bytes),
    ).metadata();
    if (!width || !height) return null;
    // EXIF orientations 5–8 are rotated 90°: width and height swap on screen.
    return (orientation ?? 1) >= 5 ? height / width : width / height;
  } catch {
    return null;
  }
}
