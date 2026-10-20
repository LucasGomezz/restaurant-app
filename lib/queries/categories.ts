import "server-only";
import { db } from "@/lib/db";
import { categoriesOf, placesVisibleTo } from "@/lib/access";
import { requireProfile } from "@/lib/auth/session";
import { placeTypes, type Category } from "@/lib/places";

/** The signed-in user's own custom types. */
export async function getCategories(): Promise<Category[]> {
  const { user } = await requireProfile();
  return db.orm.public.Category.select("id", "name", "icon", "baseKind")
    .where(categoriesOf(user.id))
    .orderBy((c) => c.name.asc())
    .all();
}

/** Built-in kinds plus the user's custom categories, for filters and forms. */
export async function getPlaceTypes() {
  return placeTypes(await getCategories());
}

/** How many of the user's places use each of their categories. */
export async function getCategoryUsage(): Promise<Record<number, number>> {
  const { user } = await requireProfile();
  const places = await db.orm.public.Restaurant.select("categoryId")
    .where(placesVisibleTo(user.id))
    .where((r) => r.categoryId.isNotNull())
    .all();

  const counts: Record<number, number> = {};
  for (const { categoryId } of places) {
    if (categoryId !== null) counts[categoryId] = (counts[categoryId] ?? 0) + 1;
  }
  return counts;
}
