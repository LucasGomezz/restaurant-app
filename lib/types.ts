import type { PlaceKind } from "@/lib/places";

export type RestaurantStatus = "PENDING" | "VISITED";

export type RestaurantMarker = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  status: RestaurantStatus;
  kind: PlaceKind;
  /** Icon and name of the place's type (its custom category, if any). */
  icon: string;
  typeLabel: string;
  /** Latest visit date, or the event's date while pending. */
  date?: string | null;
  visitCount?: number;
  /** What they wrote about the latest visit. */
  lastVisitText?: string | null;
  /** Signed URLs of the visit photos, when the restaurant was visited. */
  coverUrl?: string | null;
  placeUrl?: string | null;
};
