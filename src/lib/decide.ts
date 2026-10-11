import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Venue } from "@/lib/types";
import { googleMapsUrl } from "@/lib/mapsLinks";
import { assessDiet, normalizeVenueDiet, type DietFields } from "@/lib/diet";
import { UM_CAMPUS_CENTER, distanceMeters, formatDistance } from "@/lib/geo";
import { venueArea } from "@/lib/area";
import {
  EMPTY_QUERY,
  compileQuery,
  fold,
  parseQueryLocally,
  sanitiseQuery,
  splitPhrases,
  venueSearchText,
  type SearchQuery,
} from "@/lib/search";
import { budgetComfort, fitsBudget, formatPriceRange, midpoint, venuePriceRange, type PriceRange } from "@/lib/price";

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

// Off-campus spots, included whenever they are within the chosen distance. Coordinates are from Google Places.
const OFF_CAMPUS_DRIVING_HOTSPOTS: Venue[] = [
  {
    name: "Village Park Restaurant",
    location: "Damansara Utama (Uptown), PJ",
    placeId: "ChIJIfYLMzFJzDERPG9vHZ7DqiE",
    latitude: 3.13769,
    longitude: 101.62333,
    priceMinMYR: 10,
    priceMaxMYR: 16,
    isHalal: "halal",
    serves: ["rice", "nasi lemak", "malay"],
    dietaryTags: ["Halal", "Famous Nasi Lemak", "Malay Cuisine", "Top Rated"],
    menuItems: [
      { itemName: "Nasi Lemak Ayam Goreng Berempah", priceMYR: 13.5 },
      { itemName: "Soto Ayam", priceMYR: 10.5 },
    ],
  },
  {
    name: "Restoran Mahbub",
    location: "Lorong Bangsar, Bangsar",
    placeId: "ChIJ99BxoplJzDERhX5gIi2_BGU",
    latitude: 3.12838,
    longitude: 101.67029,
    priceMinMYR: 8,
    priceMaxMYR: 16,
    isHalal: "halal",
    serves: ["rice", "biryani", "roti", "noodles", "mamak"],
    dietaryTags: ["Halal", "Mamak", "Nasi Briyani", "Indian Muslim", "Late Night"],
    menuItems: [
      { itemName: "Nasi Briyani Ayam Madu", priceMYR: 14.5 },
      { itemName: "Mee Goreng Mamak", priceMYR: 7.5 },
    ],
  },
  {
    name: "The Ganga Cafe",
    vegetarian: "yes",
    location: "Lorong Kurau, Bangsar",
    placeId: "ChIJ-0H2IZtJzDEROu7FdjD33FY",
    latitude: 3.12264,
    longitude: 101.67102,
    priceMinMYR: 12,
    priceMaxMYR: 20,
    isHalal: "halal",
    serves: ["indian", "vegetarian", "rice"],
    dietaryTags: ["Vegetarian", "Vegan-Friendly", "Indian Cuisine", "Healthy"],
    menuItems: [
      { itemName: "Pratha with Dhal & Chana Masala", priceMYR: 12.0 },
      { itemName: "Vegetarian Biryani Set", priceMYR: 18.0 },
    ],
  },
  {
    name: "Nasi Lemak Bumbung",
    location: "Jalan 21/11b, Sea Park, PJ",
    placeId: "ChIJD0P7YHtLzDERKU8IXyctme0",
    latitude: 3.10982,
    longitude: 101.62251,
    priceMinMYR: 7,
    priceMaxMYR: 12,
    isHalal: "halal",
    serves: ["rice", "nasi lemak", "noodles"],
    dietaryTags: ["Halal", "Supper Spot", "Budget-Friendly", "PJ Classic"],
    menuItems: [
      { itemName: "Nasi Lemak Ayam Goreng + Telur Mata", priceMYR: 8.5 },
      { itemName: "Indomie Goreng Double", priceMYR: 6.5 },
    ],
  },
];

// Used only when the Firestore venues collection can't be read or is empty.
const FALLBACK_CAMPUS_VENUES: Venue[] = [
  {
    name: "KK12 Dining Hall (Raja Dr. Nazrin Shah)",
    location: "12th Residential College, Universiti Malaya",
    latitude: 3.12568,
    longitude: 101.66084,
    priceMinMYR: 6,
    priceMaxMYR: 10,
    isHalal: "halal",
    serves: ["rice", "nasi campur"],
    dietaryTags: ["Halal", "Budget-Friendly", "Nasi Campur"],
    menuItems: [{ itemName: "Nasi Campur (Ayam Goreng + 2 Sayur)", priceMYR: 7.5 }],
  },
  {
    name: "Perdanasiswa Complex (KPS) Central Canteen",
    location: "Kompleks Perdanasiswa, Universiti Malaya",
    priceMinMYR: 7,
    priceMaxMYR: 12,
    isHalal: "halal",
    serves: ["rice", "noodles"],
    dietaryTags: ["Halal", "Economy Rice", "Student Union"],
    menuItems: [{ itemName: "Nasi Kandar Ayam Bawang + Bendi", priceMYR: 9.5 }],
  },
];

// Distance assumed for hand-seeded venues that have no coordinates yet (they are on campus).
const UNKNOWN_DISTANCE_M = 800;
const DEFAULT_MAX_DISTANCE_KM = 3;
// Ranking treats venues within the same 300 m band as equally near.
const DISTANCE_BAND_M = 300;
// Venue edits (db:import-sheet, db:cli) show on the site within this long
const VENUE_CACHE_MS = 10 * 60_000;
// Room for several things at once, e.g. "sec17, chinese, rice"
const MAX_CRAVING_CHARS = 100;
// The AI's reading of a craving is kept this long; the same words mean the same thing tomorrow
const QUERY_CACHE_MS = 24 * 60 * 60_000;
const QUERY_CACHE_MAX = 200;
// Most serves values listed in the AI prompt, most common first. 50 keeps the prompt near 700 tokens (Groq's free
// tier allows 8,000 a minute) and read cravings about as well as 150 in testing.
const PROMPT_SERVES_CAP = 50;
// Back-off after a 429 when Groq doesn't send retry-after
const DEFAULT_AI_PAUSE_S = 10;
// A slower AI call is abandoned and code's reading is kept. The page already shows code's results by then, so
// waiting longer only delays the refinement. Groq answers in 0.3-0.8 s.
const AI_TIMEOUT_MS = 4_000;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Override with GROQ_MODEL in .env.local. Qwen split and spelled cravings best of the models tried.
const DEFAULT_GROQ_MODEL = "qwen/qwen3.8-27b";

// Reasoning models think before answering; keyword lookup needs none of that, and it costs time.
function reasoningOptions(model: string) {
  if (model.startsWith("qwen/")) return { reasoning_effort: "none" };
  if (model.startsWith("openai/gpt-oss")) return { reasoning_effort: "low" };
  return {};
}

// unconfirmed: ticked diet filters nobody has checked this venue for, e.g. "Halal unconfirmed"; empty when all are confirmed
// hits: labels of the craving's food groups the venue matches; exact: how many of those it matches by the label itself
type Candidate = {
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

// The words the AI should translate the craving into: every area and the most common serves values. Cuisines are
// left out: the model knows them, and every token counts against Groq's per-minute limit.
type Vocabulary = { areas: string[]; serves: string[] };

function buildVocabulary(venues: Venue[]): Vocabulary {
  const areas = new Set<string>();
  const serves = new Map<string, number>();
  for (const venue of venues) {
    const area = venueArea(venue.location);
    if (area) areas.add(area);
    for (const item of venue.serves ?? []) {
      const key = item.toLowerCase().trim();
      if (key) serves.set(key, (serves.get(key) ?? 0) + 1);
    }
  }
  return {
    areas: [...areas].sort(),
    serves: [...serves].sort((a, b) => b[1] - a[1]).slice(0, PROMPT_SERVES_CAP).map(([item]) => item),
  };
}

// The AI's readings, by folded craving. Map order is insertion order, so the first key is the oldest.
const queryCache = new Map<string, { at: number; query: SearchQuery }>();

const queryKey = (craving: string) => fold(craving).replace(/\s+/g, " ").trim();

function cachedQuery(key: string) {
  const hit = queryCache.get(key);
  if (hit && Date.now() - hit.at < QUERY_CACHE_MS) return hit.query;
  queryCache.delete(key);
  return undefined;
}

// After a 429 (Groq's per-minute token or daily request limit), searches use code's reading until Groq says to retry,
// rather than each one spending a request to be refused.
let aiPausedUntil = 0;

// Asks the AI what the craving means as areas and keyword groups. Code checks the answer and does all the
// filtering; the AI never sees venues, prices or diet data.
async function interpretQuery(apiKey: string, craving: string, key: string, vocab: Vocabulary) {
  const prompt = `
A Universiti Malaya student typed this into a food search box: ${JSON.stringify(craving)}

Turn it into search keywords for a database of eateries around campus. Answer with JSON only, in exactly this shape:
{"areas": ["Section 17"], "groups": [{"label": "rice", "terms": ["rice", "nasi", "chicken rice"]}]}

- "areas": neighbourhoods the student named, copied exactly from the area list below ("sec17" is "Section 17",
  "paramount" is "Taman Paramount"). Empty when they named none.
- "groups": one group per separate thing they want: a dish, cuisine, food type, or venue or brand name.
  "chinese rice" is two groups (chinese, rice); "chicken rice" is one dish, so one group. Empty when they named none.
  - "label": that thing in 1 to 3 words, spelled correctly, as the student meant it.
  - "terms": up to 10 lowercase words or short phrases that appear in a venue's name, cuisine, menu or serves list
    when it has that thing: the word itself, spelling variants, Malay, Chinese and English names, and specific dishes
    of that kind. Prefer words from the lists below. Examples: "bakuteh" -> ["bak kut teh", "肉骨茶"];
    "zus" -> ["zus", "zus coffee"]; "mcd" -> ["mcdonald"]; "noodles" -> ["noodle", "mee", "kuey teow", "laksa", "ramen"].
  - Keep terms specific to that thing. No broader words that many other venues share: not "rice" or "malay" for
    nasi lemak, not "teh" or "tea" for bak kut teh, not "coffee" for zus.
- Leave out words that don't describe food or place, such as "food", "near", "cheap", "now".

Areas: ${JSON.stringify(vocab.areas)}
Serves: ${JSON.stringify(vocab.serves)}
`;

  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0,
      ...reasoningOptions(model),
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  if (response.status === 429) {
    const waitSeconds = Number(response.headers.get("retry-after")) || DEFAULT_AI_PAUSE_S;
    aiPausedUntil = Date.now() + waitSeconds * 1000;
  }
  if (!response.ok) throw new Error(`Groq returned ${response.status}: ${(await response.text()).slice(0, 300)}`);

  const completion = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const query = sanitiseQuery(JSON.parse(completion.choices?.[0]?.message?.content ?? "{}"), vocab.areas);
  if (query) {
    if (queryCache.size >= QUERY_CACHE_MAX) queryCache.delete(queryCache.keys().next().value!);
    queryCache.set(key, { at: Date.now(), query });
  }
  return query;
}

// Venue list kept in memory, since every search needs all of it. Once it is older than VENUE_CACHE_MS the old list
// keeps answering while a fresh copy loads in the background, so only the first request on a fresh server waits for
// Firestore (about 0.6 s). Each full read costs one Firestore read per venue, hence the long lifetime.
let venueCache: { at: number; venues: Venue[] } | undefined;
// The read in flight, shared so simultaneous requests don't each start one
let venueRefresh: Promise<Venue[]> | undefined;

async function fetchVenues(): Promise<Venue[]> {
  if (!db) return [];
  try {
    const venues: Venue[] = [];
    const snapshot = await getDocs(collection(db, "venues"));
    snapshot.forEach((docSnap) => {
      venues.push(normalizeVenueDiet({ id: docSnap.id, ...(docSnap.data() as Omit<Venue, "id">) }));
    });
    venueCache = { at: Date.now(), venues };
    return venues;
  } catch (err) {
    console.warn("Could not fetch venues from Firestore, proceeding with the last list or the fallback:", err);
    return venueCache?.venues ?? [];
  }
}

function refreshVenues(): Promise<Venue[]> {
  venueRefresh ??= fetchVenues().finally(() => {
    venueRefresh = undefined;
  });
  return venueRefresh;
}

async function loadVenues(): Promise<Venue[]> {
  if (!venueCache) return refreshVenues();
  if (Date.now() - venueCache.at >= VENUE_CACHE_MS) void refreshVenues();
  return venueCache.venues;
}

// Matches for one search: used by /api/decide and by the home page's server render.
export async function decideMatches(body: Partial<DecideRequestPayload>): Promise<DecideResponseData> {
  const craving = String(body.craving ?? "").trim().slice(0, MAX_CRAVING_CHARS);
  const maxBudget = Number(body.maxBudget ?? 15);
  const dietaryRestrictions = Array.isArray(body.dietaryRestrictions) ? body.dietaryRestrictions : [];
  const maxDistanceKm =
    body.maxDistanceKm === null
      ? null
      : typeof body.maxDistanceKm === "number" && body.maxDistanceKm > 0
        ? body.maxDistanceKm
        : DEFAULT_MAX_DISTANCE_KM;

  // 1. Load venues from Firestore (cached briefly so every tap doesn't re-read the whole collection)
  let venues = await loadVenues();
  if (venues.length === 0) venues = FALLBACK_CAMPUS_VENUES;
  const knownPlaceIds = new Set(venues.map((v) => v.placeId).filter(Boolean));
  venues = [...venues, ...OFF_CAMPUS_DRIVING_HOTSPOTS.filter((v) => !knownPlaceIds.has(v.placeId))];

  // 2. Read the craving into areas and food groups: code's reading (commas split it; known area names and food
  // aliases are recognised), and the AI's when it is cached or can be fetched
  const vocab = buildVocabulary(venues);
  const localQuery = craving ? parseQueryLocally(craving, vocab.areas) : EMPTY_QUERY;
  let aiQuery: SearchQuery | undefined;
  if (craving) {
    const key = queryKey(craving);
    const apiKey = process.env.GROQ_API_KEY;
    aiQuery = cachedQuery(key);
    if (!aiQuery && apiKey && !body.skipAi && Date.now() >= aiPausedUntil) {
      try {
        aiQuery = await interpretQuery(apiKey, craving, key, vocab);
      } catch (err) {
        console.warn("AI could not read the craving, using code's reading:", err);
      }
    }
  }

  // 3. Drop venues that can't work: no price, cheapest meal over budget, known to break a ticked diet filter,
  // too far, outside a named area, or matching none of the food groups.
  // A venue nobody has checked for a ticked filter stays, marked unconfirmed, and is kept out of the top 3 below.
  // Venues with no coordinates are the hand-seeded on-campus ones, so the distance filter keeps them.
  const findCandidates = (q: SearchQuery): Candidate[] => {
    // A named area means the student wants to go there, so the distance limit doesn't apply
    const distanceLimitM = q.areas.length > 0 || maxDistanceKm === null ? null : maxDistanceKm * 1000;
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
  };
  let query = localQuery;
  let engine: DecideResponseData["engine"] = "fallback";
  let candidates = findCandidates(localQuery);
  // The AI's reading wins (spelling fixes, synonyms) unless it would lose the search. The AI knows dishes and areas
  // but not venue names, so for "tanaair" it reads nothing, which would show every venue; or it guesses a word
  // that matches nothing while code's reading found the venue by name.
  if (aiQuery) {
    const isEmpty = (q: SearchQuery) => q.areas.length === 0 && q.groups.length === 0;
    if (!isEmpty(aiQuery) || isEmpty(localQuery)) {
      const aiCandidates = findCandidates(aiQuery);
      if (aiCandidates.length > 0 || candidates.length === 0) {
        query = aiQuery;
        engine = "ai";
        candidates = aiCandidates;
      }
    }
  }
  // Code's reading keeps "chinese rice" as one phrase; when that finds nothing, try its words separately
  const split = candidates.length === 0 && engine === "fallback" ? splitPhrases(query) : undefined;
  if (split) {
    query = split;
    candidates = findCandidates(split);
  }

  // 4. Venues matching more of the food groups first ("chinese" and "rice" before just "rice"), then more of them
  // by the label itself ("nasi lemak" before a looser "rice"), then nearest, within budget, best rated, cheapest
  const ranked = candidates.sort(
    (a, b) => b.hits.length - a.hits.length || b.exact - a.exact || rankByDistanceAndRating(a, b),
  );

  // Confirmed venues keep their order and come first; unconfirmed ones follow, only ever in moreMatches.
  const confirmed = ranked.filter((c) => c.unconfirmed.length === 0);
  const unconfirmed = ranked.filter((c) => c.unconfirmed.length > 0);
  const { top, rest } = pickTopThree(confirmed);
  return {
    recommendations: top.map((c) => ({ ...c.match, reasoning: reasonFor(c, query) })),
    moreMatches: [...rest, ...unconfirmed].map((c) => c.match),
    engine,
    query,
  };
}
