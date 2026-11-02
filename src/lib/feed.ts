import { chainKey } from "@/lib/chains";
import { assessDiet, type DietFields } from "@/lib/diet";
import { formatDistance } from "@/lib/geo";
import { formatPriceRange, midpoint, type PriceRange } from "@/lib/price";
import type { SearchQuery } from "@/lib/search";

// A venue that fits the student's budget, distance and craving, and isn't known to break the diet filters the
// server was asked for.
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
  // Labels of the craving's food groups the venue matches; exact: how many of those it matches by the label itself
  hits: string[];
  exact: number;
}

export interface TopPick extends VenueMatch {
  // "Why this pick"
  reasoning: string;
}

// unconfirmed: ticked diet filters nobody has checked this venue for, e.g. "Halal unconfirmed"
export type SeeMoreItem = { match: VenueMatch; unconfirmed: string[] };

export interface Feed {
  topPicks: TopPick[];
  seeMore: SeeMoreItem[];
}

// Distance assumed for hand-seeded venues that have no coordinates yet (they are on campus).
const UNKNOWN_DISTANCE_M = 800;
// Ranking treats venues within the same 300 m band as equally near.
const DISTANCE_BAND_M = 300;

const nearness = (m: VenueMatch) => m.distanceMeters ?? UNKNOWN_DISTANCE_M;
const priceRange = (m: VenueMatch): PriceRange => ({ min: m.priceMinMYR, max: m.priceMaxMYR });

// Venues matching more of the food groups first ("chinese" and "rice" before just "rice"), then more of them by
// the label itself ("nasi lemak" before a looser "rice"), then nearest (in 300 m bands), then those whose whole
// price range is within budget before those where only the cheaper meals are, then best rated, then the lowest
// typical (midpoint) price.
function byRank(a: VenueMatch, b: VenueMatch) {
  const band = (m: VenueMatch) => Math.round(nearness(m) / DISTANCE_BAND_M);
  return (
    b.hits.length - a.hits.length ||
    b.exact - a.exact ||
    band(a) - band(b) ||
    Number(b.withinBudget) - Number(a.withinBudget) ||
    (b.rating ?? 0) - (a.rating ?? 0) ||
    midpoint(priceRange(a)) - midpoint(priceRange(b))
  );
}

// Top 3 holds at most one branch per chain: the nearest of that chain's branches that match the search as well as
// its best one, so a nearer branch never brings in a weaker match. Every other venue, other branches included,
// keeps its order in See more.
function pickTopThree(ranked: VenueMatch[]): { top: VenueMatch[]; rest: VenueMatch[] } {
  const top: VenueMatch[] = [];
  const used = new Set<VenueMatch>();
  const seenChains = new Set<string>();
  for (const entry of ranked) {
    if (top.length >= 3) break;
    const key = chainKey(entry.venueName);
    if (seenChains.has(key)) continue;
    seenChains.add(key);
    const nearest = ranked
      .filter(
        (m) =>
          !used.has(m) && chainKey(m.venueName) === key && m.hits.length === entry.hits.length && m.exact === entry.exact,
      )
      .reduce((a, b) => (nearness(b) < nearness(a) ? b : a));
    used.add(nearest);
    top.push(nearest);
  }
  return { top, rest: ranked.filter((m) => !used.has(m)) };
}

// e.g. "RM12-25"
export function priceLabel(m: VenueMatch) {
  return `RM${formatPriceRange(priceRange(m))}`;
}

// The card's "Why this pick": what it matched, then distance, price, halal and rating.
// e.g. "Matches chinese, rice in Section 17: 3.4 km from campus centre, RM8-12, all within budget, halal."
function reasonFor(m: VenueMatch, query: SearchQuery) {
  const price = priceLabel(m);
  const parts = [m.withinBudget ? `${price}, all within budget` : `${price}, cheaper meals within budget`];
  if (m.distanceMeters !== undefined) parts.unshift(`${formatDistance(m.distanceMeters)} from campus centre`);
  if (m.isHalal) parts.push("halal");
  if (m.rating) parts.push(`rated ${m.rating.toFixed(1)}`);
  const inArea = query.areas.length > 0 && m.area ? ` in ${m.area}` : "";
  const lead = m.hits.length > 0 ? `Matches ${m.hits.join(", ")}${inArea}: ` : inArea ? `In ${m.area}: ` : "";
  return `${lead}${parts.join(", ")}.`;
}

// One search's top picks and See more, from its matches in any order. Run again with the same matches when the
// student ticks another diet filter: it only hides venues, so it needs no new search.
export function arrangeFeed(matches: VenueMatch[], dietFilter: string[], query: SearchQuery): Feed {
  // A venue known to break a ticked filter is left out; one nobody has checked for it stays, but only in See more,
  // after the confirmed venues.
  const assessed = matches.flatMap((match) => {
    const diet = assessDiet(match.diet, dietFilter);
    return diet.fits ? [{ match, unconfirmed: diet.unconfirmed }] : [];
  });
  const confirmed = assessed.filter((a) => a.unconfirmed.length === 0).map((a) => a.match);
  const unconfirmed = assessed.filter((a) => a.unconfirmed.length > 0);
  const { top, rest } = pickTopThree(confirmed.sort(byRank));
  return {
    topPicks: top.map((m) => ({ ...m, reasoning: reasonFor(m, query) })),
    seeMore: [
      ...rest.map((match) => ({ match, unconfirmed: [] })),
      ...unconfirmed.sort((a, b) => byRank(a.match, b.match)),
    ],
  };
}
