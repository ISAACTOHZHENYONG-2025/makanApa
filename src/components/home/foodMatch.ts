import type { RecommendationItem, VenueMatch } from "@/lib/decide/types";
import { formatDistance } from "@/lib/geo";
import { formatPriceRange } from "@/lib/price";

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

export function priceLabel(match: VenueMatch) {
  return `RM${formatPriceRange({ min: match.priceMinMYR, max: match.priceMaxMYR })}`;
}

export function fromRecommendation(rec: RecommendationItem, index: number, budget: number): FoodMatch {
  return {
    id: `${index}-${rec.venueName}`,
    venueId: rec.venueId,
    rank: index + 1,
    title: rec.venueName,
    price: priceLabel(rec),
    priceNote: rec.withinBudget ? `Under RM${budget}` : `Some over RM${budget}`,
    priceWithinBudget: rec.withinBudget,
    isHalal: rec.isHalal,
    isVegetarian: rec.isVegetarian,
    isVegan: rec.isVegan,
    allergyNotes: rec.allergyNotes,
    distanceLabel: distanceLabel(rec),
    distanceShort: rec.distanceMeters === undefined ? undefined : formatDistance(rec.distanceMeters),
    serves: rec.serves.join(", "),
    insight: rec.reasoning,
    mapsUrl: rec.mapsUrl,
  };
}
