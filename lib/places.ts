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

/** `?tipo=viajes` → "TRIP"; anything else → undefined (no filter). */
export function kindFromSlug(slug: string | string[] | undefined) {
  return KIND_ORDER.find((kind) => KINDS[kind].slug === slug);
}
