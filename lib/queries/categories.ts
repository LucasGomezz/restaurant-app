import "server-only";
import { db } from "@/lib/db";
import { placeTypes, type Category } from "@/lib/places";

export async function getCategories(): Promise<Category[]> {
  return db.orm.public.Category.select("id", "name", "icon", "baseKind")
    .orderBy((c) => c.name.asc())
    .all();
}

/** Built-in kinds plus the custom categories, for filters and forms. */
export async function getPlaceTypes() {
  return placeTypes(await getCategories());
}
