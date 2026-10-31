import type { TopPick, VenueMatch } from "@/app/api/decide/route";
import { formatDistance } from "@/lib/geo";
import { priceLabel } from "@/lib/feed";

export type FoodMatch = {
  id: string;
  // The venue's Firestore doc id, which names its photo; absent for the built-in fallback venues
  venueId?: string;
  rank: number;
  title: string;
  // e.g. "RM12-25"
  price: string;
  priceNote: string;
  // False when only the cheaper end of the range fits the budget
  priceWithinBudget: boolean;
  isHalal: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  allergyNotes?: string;
  // e.g. "SS2 · 3.4 km from campus centre"; absent when the venue has neither an area nor coordinates
  distanceLabel?: string;
  // e.g. "650 m", for the card badge
  distanceShort?: string;
  serves: string;
  insight: string;
  mapsUrl: string;
};

// The venue's area, then its distance: "SS2 · 3.4 km from campus centre", or either one alone.
export function distanceLabel(match: VenueMatch) {
  const distance =
    match.distanceMeters === undefined ? undefined : `${formatDistance(match.distanceMeters)} from campus centre`;
  return [match.area, distance].filter(Boolean).join(" · ") || undefined;
}

export function fromTopPick(pick: TopPick, index: number, budget: number): FoodMatch {
  return {
    id: pick.venueId ?? pick.venueName,
    venueId: pick.venueId,
    rank: index + 1,
    title: pick.venueName,
    price: priceLabel(pick),
    priceNote: pick.withinBudget ? `Under RM${budget}` : `Some over RM${budget}`,
    priceWithinBudget: pick.withinBudget,
    isHalal: pick.isHalal,
    isVegetarian: pick.isVegetarian,
    isVegan: pick.isVegan,
    allergyNotes: pick.allergyNotes,
    distanceLabel: distanceLabel(pick),
    distanceShort: pick.distanceMeters === undefined ? undefined : formatDistance(pick.distanceMeters),
    serves: pick.serves.join(", "),
    insight: pick.reasoning,
    mapsUrl: pick.mapsUrl,
  };
}
