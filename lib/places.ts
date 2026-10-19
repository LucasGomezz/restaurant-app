export type PlaceKind = "RESTAURANT" | "TRIP" | "EVENT";

type KindInfo = {
  label: string;
  plural: string;
  /** URL value for the `?tipo=` filter. */
  slug: string;
  icon: string;
  /** Placeholder for the name field. */
  namePlaceholder: string;
};

export const KINDS: Record<PlaceKind, KindInfo> = {
  RESTAURANT: {
    label: "Restaurante",
    plural: "Restaurantes",
    slug: "restaurantes",
    icon: "🍽",
    namePlaceholder: "Ej: La Parolaccia",
  },
  TRIP: {
    label: "Viaje",
    plural: "Viajes",
    slug: "viajes",
    icon: "✈️",
    namePlaceholder: "Ej: Bariloche",
  },
  EVENT: {
    label: "Evento",
    plural: "Eventos",
    slug: "eventos",
    icon: "🎟",
    namePlaceholder: "Ej: Recital en el Movistar Arena",
  },
};

export const KIND_ORDER: PlaceKind[] = ["RESTAURANT", "TRIP", "EVENT"];

export function isPlaceKind(value: unknown): value is PlaceKind {
  return typeof value === "string" && value in KINDS;
}

// ---------- Place types: built-in kinds + custom categories ----------

/** A custom type created from the app (a row of the `category` table). */
export type Category = {
  id: number;
  name: string;
  icon: string;
  baseKind: PlaceKind;
};

/**
 * Anything a place can be filtered by: a built-in kind or a custom category.
 * `kind` drives behaviour (dishes, trip dates, event date); the rest is display.
 */
export type PlaceType = {
  /** Form value: the kind ("TRIP") or `c:<id>` for a category. */
  key: string;
  label: string;
  plural: string;
  slug: string;
  icon: string;
  kind: PlaceKind;
  categoryId: number | null;
  namePlaceholder: string;
};

export const CATEGORY_KEY_PREFIX = "c:";

/** "Bodega" → "Bodegas", "Bar" → "Bares"; multi-word names stay as they are. */
function pluralize(name: string) {
  if (/\s/.test(name)) return name;
  if (/[aeiouáéó]$/i.test(name)) return `${name}s`;
  if (/z$/i.test(name)) return `${name.slice(0, -1)}ces`;
  return `${name}es`;
}

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function builtinType(kind: PlaceKind): PlaceType {
  const { label, plural, slug, icon, namePlaceholder } = KINDS[kind];
  return {
    key: kind,
    label,
    plural,
    slug,
    icon,
    kind,
    categoryId: null,
    namePlaceholder,
  };
}

export function categoryType(category: Category): PlaceType {
  return {
    key: `${CATEGORY_KEY_PREFIX}${category.id}`,
    label: category.name,
    plural: pluralize(category.name),
    // The id keeps it unique even if two names slugify alike.
    slug: `${slugify(category.name) || "tipo"}-${category.id}`,
    icon: category.icon,
    kind: category.baseKind,
    categoryId: category.id,
    namePlaceholder: KINDS[category.baseKind].namePlaceholder,
  };
}

/** Built-in kinds first, then the custom categories. */
export function placeTypes(categories: Category[]): PlaceType[] {
  return [...KIND_ORDER.map(builtinType), ...categories.map(categoryType)];
}

/** `?tipo=bodega-3` → that type; anything else → undefined (no filter). */
export function typeFromSlug(
  types: PlaceType[],
  slug: string | string[] | undefined,
) {
  return types.find((type) => type.slug === slug);
}

/** The type a place shows as: its category if it has one, else its kind. */
export function typeOf(
  types: PlaceType[],
  place: { kind: PlaceKind; categoryId: number | null },
): PlaceType {
  return (
    (place.categoryId !== null &&
      types.find((type) => type.categoryId === place.categoryId)) ||
    types.find((type) => type.key === place.kind)!
  );
}
