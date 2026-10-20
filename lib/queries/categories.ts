import "server-only";
import { db } from "@/lib/db";
import { categoriesOf, visiblePlacesQuery } from "@/lib/access";
import { requireProfile } from "@/lib/auth/session";
import { placeTypes, type Category } from "@/lib/places";

const CATEGORY_FIELDS = ["id", "name", "icon", "baseKind"] as const;

/** The signed-in user's own custom types. */
export async function getCategories(): Promise<Category[]> {
  const { user } = await requireProfile();
  return db.orm.public.Category.select(...CATEGORY_FIELDS)
    .where(categoriesOf(user.id))
    .orderBy((c) => c.name.asc())
    .all();
}

async function categoriesById(ids: number[]): Promise<Category[]> {
  if (ids.length === 0) return [];
  return db.orm.public.Category.select(...CATEGORY_FIELDS)
    .where((c) => c.id.in(ids))
    .orderBy((c) => c.name.asc())
    .all();
}

/**
 * Every type a visible place can show as, for labels and filters: built-in
 * kinds, the user's own types, and the types of places shared with them.
 */
export async function getPlaceTypes() {
  const { user } = await requireProfile();
  const [own, used] = await Promise.all([
    getCategories(),
    (await visiblePlacesQuery(user.id))
      .where((r) => r.categoryId.isNotNull())
      .select("categoryId")
      .all(),
  ]);
  const ownIds = new Set(own.map((c) => c.id));
  const sharedIds = [
    ...new Set(
      used
        .map((p) => p.categoryId)
        .filter((id): id is number => id !== null && !ownIds.has(id)),
    ),
  ];
  return placeTypes([...own, ...(await categoriesById(sharedIds))]);
}

/**
 * Types to choose from in the place form: built-in kinds and the user's own
 * types, plus `currentCategoryId` so editing a shared place keeps its type.
 */
export async function getFormPlaceTypes(currentCategoryId?: number | null) {
  const own = await getCategories();
  const keep =
    currentCategoryId != null && !own.some((c) => c.id === currentCategoryId)
      ? await categoriesById([currentCategoryId])
      : [];
  return placeTypes([...own, ...keep]);
}

/** How many of the user's places use each of their categories. */
export async function getCategoryUsage(): Promise<Record<number, number>> {
  const { user } = await requireProfile();
  const places = await db.orm.public.Restaurant.select("categoryId")
    .where({ ownerId: user.id })
    .where((r) => r.categoryId.isNotNull())
    .all();

  const counts: Record<number, number> = {};
  for (const { categoryId } of places) {
    if (categoryId !== null) counts[categoryId] = (counts[categoryId] ?? 0) + 1;
  }
  return counts;
}
