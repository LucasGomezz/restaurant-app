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
  /** Created by the signed-in user (not shared with them through a folder). */
  isOwn?: boolean;
};
