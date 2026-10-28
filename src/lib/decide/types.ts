import type { DietFields } from "@/lib/diet";
import type { SearchQuery } from "@/lib/search";

export interface DecideRequestPayload {
  // Free text, one or several things: "noodles", "zus", "sec17, chinese, rice". Empty means anything.
  craving?: string;
  maxBudget: number;
  // Straight-line distance from the UM campus centre; null means any distance.
  maxDistanceKm?: number | null;
  dietaryRestrictions: string[];
  // True reads the craving without the AI (unless its reading is cached), so the page can show results straight away.
  skipAi?: boolean;
}

// A venue that fits the student's budget, diet and distance.
export interface VenueMatch {
  // Firestore doc id (the Google Place ID); names the venue's photo file. Absent for the built-in fallback venues.
  venueId?: string;
  venueName: string;
  // Usual meal price range; equal when the venue has a single price.
  priceMinMYR: number;
  priceMaxMYR: number;
  // True when even the dearest usual meal is within budget; false when only the cheaper ones are.
  withinBudget: boolean;
  isHalal: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  // The sheet's raw answers (blank = unchecked), so the feed can apply a newly ticked diet filter without a refetch
  diet: DietFields;
  // Shown on the card as a warning; not a filter
  allergyNotes?: string;
  serves: string[];
  rating?: number;
  // Straight-line distance from the UM campus centre; absent when the venue has no coordinates.
  distanceMeters?: number;
  // Short neighbourhood name from the address, e.g. "SS2" or "UM"; absent when the address doesn't say.
  area?: string;
  // Google Maps directions link; Maps works out the route from the user's location.
  mapsUrl: string;
}

export interface RecommendationItem extends VenueMatch {
  reasoning: string;
}

export interface DecideResponseData {
  recommendations: RecommendationItem[];
  moreMatches: VenueMatch[];
  // "ai" when the AI read the craving into the query; "fallback" when code did
  engine: "ai" | "fallback";
  // How the craving was read, for showing back to the student
  query: SearchQuery;
}
