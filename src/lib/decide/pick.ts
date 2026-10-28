import type { Venue } from "@/lib/types";
import { googleMapsUrl } from "@/lib/mapsLinks";
import { assessDiet } from "@/lib/diet";
import { UM_CAMPUS_CENTER, distanceMeters, formatDistance } from "@/lib/geo";
import { venueArea } from "@/lib/area";
import { compileQuery, venueSearchText, type SearchQuery } from "@/lib/search";
import { budgetComfort, fitsBudget, formatPriceRange, midpoint, venuePriceRange, type PriceRange } from "@/lib/price";
import type { RecommendationItem, VenueMatch } from "./types";

// Distance assumed for hand-seeded venues that have no coordinates yet (they are on campus).
const UNKNOWN_DISTANCE_M = 800;
// Ranking treats venues within the same 300 m band as equally near.
const DISTANCE_BAND_M = 300;

// unconfirmed: ticked diet filters nobody has checked this venue for, e.g. "Halal unconfirmed"; empty when all are confirmed
// hits: labels of the craving's food groups the venue matches; exact: how many of those it matches by the label itself
export type Candidate = {
  venue: Venue;
  match: VenueMatch;
  price: PriceRange;
  unconfirmed: string[];
  hits: string[];
  exact: number;
};

// First words that don't identify a chain, so "Kafe Sains" and "Kafe Bahasa" stay separate places, and so do
// "SS2 Rising Kopitiam" and "SS2 Durian Glasshause".
const GENERIC_FIRST_WORDS = new Set([
  "kafe", "cafe", "restoran", "restaurant", "kedai", "warung", "the", "nasi", "gerai", "medan", "food",
  "ss2", "seksyen", "section", "pj",
]);

// Branches of one chain share a key: "KFC Jalan Universiti DT" and "KFC Gateway Mall" are both "kfc".
function chainKey(name: string) {
  const normalised = name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const first = normalised.split(" ")[0];
  return first && !GENERIC_FIRST_WORDS.has(first) ? first : normalised;
}

const nearness = (c: Candidate) => c.match.distanceMeters ?? UNKNOWN_DISTANCE_M;

// Top 3 holds at most one branch per chain: the nearest of that chain's branches that match the search as well as
// its best one, so a nearer branch never brings in a weaker match. Every other candidate, other branches included,
// keeps its order in moreMatches.
function pickTopThree(ranked: Candidate[]): { top: Candidate[]; rest: Candidate[] } {
  const top: Candidate[] = [];
  const used = new Set<Candidate>();
  const seenChains = new Set<string>();
  for (const entry of ranked) {
    if (top.length >= 3) break;
    const key = chainKey(entry.venue.name);
    if (seenChains.has(key)) continue;
    seenChains.add(key);
    const nearest = ranked
      .filter(
        (c) =>
          !used.has(c) &&
          chainKey(c.venue.name) === key &&
          c.hits.length === entry.hits.length &&
          c.exact === entry.exact,
      )
      .reduce((a, b) => (nearness(b) < nearness(a) ? b : a));
    used.add(nearest);
    top.push(nearest);
  }
  return { top, rest: ranked.filter((c) => !used.has(c)) };
}

function toVenueMatch(venue: Venue, price: PriceRange, budget: number): VenueMatch {
  const hasCoords = typeof venue.latitude === "number" && typeof venue.longitude === "number";
  const meters = hasCoords
    ? Math.round(distanceMeters(UM_CAMPUS_CENTER, { latitude: venue.latitude!, longitude: venue.longitude! }))
    : undefined;

  return {
    venueId: venue.id ?? venue.placeId,
    venueName: venue.name,
    priceMinMYR: price.min,
    priceMaxMYR: price.max,
    withinBudget: budgetComfort(price, budget) === 0,
    isHalal: venue.isHalal === "halal", // only a confirmed halal venue carries the badge
    isVegetarian: venue.vegetarian === "yes" || venue.vegan === "yes",
    isVegan: venue.vegan === "yes",
    diet: {
      isHalal: venue.isHalal,
      vegetarian: venue.vegetarian,
      vegan: venue.vegan,
      noSeafoodOption: venue.noSeafoodOption,
      nonHalal: venue.nonHalal,
      noBeefOption: venue.noBeefOption,
    },
    allergyNotes: venue.allergyNotes,
    serves: venue.serves ?? [],
    rating: venue.rating,
    distanceMeters: meters,
    area: venueArea(venue.location),
    mapsUrl: googleMapsUrl(venue),
  };
}

// Code-only ranking: nearest first (in 300 m bands), then venues whose whole price range is within budget
// before those where only the cheaper meals are, then best rated, then the lowest typical (midpoint) price.
function rankByDistanceAndRating(a: Candidate, b: Candidate) {
  const band = (c: Candidate) => Math.round(nearness(c) / DISTANCE_BAND_M);
  return (
    band(a) - band(b) ||
    Number(b.match.withinBudget) - Number(a.match.withinBudget) ||
    (b.match.rating ?? 0) - (a.match.rating ?? 0) ||
    midpoint(a.price) - midpoint(b.price)
  );
}


// The card's "Why this pick": what it matched, then distance, price, halal and rating.
// e.g. "Matches chinese, rice in Section 17: 3.4 km from campus centre, RM8-12, all within budget, halal."
function reasonFor(c: Candidate, query: SearchQuery) {
  const parts = [c.match.withinBudget ? `RM${formatPriceRange(c.price)}, all within budget` : `RM${formatPriceRange(c.price)}, cheaper meals within budget`];
  if (c.match.distanceMeters !== undefined) parts.unshift(`${formatDistance(c.match.distanceMeters)} from campus centre`);
  if (c.match.isHalal) parts.push("halal");
  if (c.match.rating) parts.push(`rated ${c.match.rating.toFixed(1)}`);
  const inArea = query.areas.length > 0 && c.match.area ? ` in ${c.match.area}` : "";
  const lead = c.hits.length > 0 ? `Matches ${c.hits.join(", ")}${inArea}: ` : inArea ? `In ${c.match.area}: ` : "";
  return `${lead}${parts.join(", ")}.`;
}

export type PickParams = {
  maxBudget: number;
  dietaryRestrictions: string[];
  // Straight-line limit from the campus centre in metres; null means any distance.
  distanceLimitM: number | null;
};

// Drops venues that can't work: no price, cheapest meal over budget, known to break a ticked diet filter,
// too far, outside a named area, or matching none of the food groups.
// A venue nobody has checked for a ticked filter stays, marked unconfirmed, and is kept out of the top 3 below.
// Venues with no coordinates are the hand-seeded on-campus ones, so the distance filter keeps them.
export function findCandidates(venues: Venue[], q: SearchQuery, params: PickParams): Candidate[] {
  const { maxBudget, dietaryRestrictions, distanceLimitM } = params;
  const matchGroups = compileQuery(q);
  return venues.flatMap((venue) => {
    const price = venuePriceRange(venue);
    if (!price || !fitsBudget(price, maxBudget)) return [];
    const diet = assessDiet(venue, dietaryRestrictions);
    if (!diet.fits) return [];
    const match = toVenueMatch(venue, price, maxBudget);
    if (distanceLimitM !== null && match.distanceMeters !== undefined && match.distanceMeters > distanceLimitM) return [];
    if (q.areas.length > 0 && !(match.area && q.areas.includes(match.area))) return [];
    const { hits, exact } = matchGroups(venueSearchText(venue));
    if (q.groups.length > 0 && hits.length === 0) return [];
    return [{ venue, price, match, unconfirmed: diet.unconfirmed, hits, exact }];
  });
}

// Venues matching more of the food groups first ("chinese" and "rice" before just "rice"), then more of them
// by the label itself ("nasi lemak" before a looser "rice"), then nearest, within budget, best rated, cheapest.
// Confirmed venues keep their order and come first; unconfirmed ones follow, only ever in moreMatches.
export function pickMatches(
  candidates: Candidate[],
  query: SearchQuery,
): { recommendations: RecommendationItem[]; moreMatches: VenueMatch[] } {
  const ranked = [...candidates].sort(
    (a, b) => b.hits.length - a.hits.length || b.exact - a.exact || rankByDistanceAndRating(a, b),
  );
  const confirmed = ranked.filter((c) => c.unconfirmed.length === 0);
  const unconfirmed = ranked.filter((c) => c.unconfirmed.length > 0);
  const { top, rest } = pickTopThree(confirmed);
  return {
    recommendations: top.map((c) => ({ ...c.match, reasoning: reasonFor(c, query) })),
    moreMatches: [...rest, ...unconfirmed].map((c) => c.match),
  };
}
