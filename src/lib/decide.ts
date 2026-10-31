import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Venue } from "@/lib/types";
import { googleMapsUrl } from "@/lib/mapsLinks";
import { assessDiet, normalizeVenueDiet } from "@/lib/diet";
import { UM_CAMPUS_CENTER, distanceMeters } from "@/lib/geo";
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
import { budgetComfort, fitsBudget, venuePriceRange, type PriceRange } from "@/lib/price";
import type { VenueMatch } from "@/lib/feed";

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

export type { TopPick, VenueMatch } from "@/lib/feed";

export interface DecideResponseData {
  // Every venue that fits the search, in no particular order; arrangeFeed turns them into top picks and See more
  matches: VenueMatch[];
  // "ai" when the AI read the craving into the query; "fallback" when code did
  engine: "ai" | "fallback";
  // How the craving was read, for showing back to the student
  query: SearchQuery;
  // True when asking again without skipAi could bring the AI's reading: there is a craving, no AI reading was used
  // or cached, and the AI is set up and not paused after a 429. The page skips its refinement request otherwise.
  aiCanRefine: boolean;
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
export const FALLBACK_CAMPUS_VENUES: Venue[] = [
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

const DEFAULT_MAX_DISTANCE_KM = 3;
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

// Everything on the card except what depends on the search: withinBudget, hits and exact
type VenueCard = Omit<VenueMatch, "withinBudget" | "hits" | "exact">;

function toVenueCard(venue: Venue, price: PriceRange): VenueCard {
  const hasCoords = typeof venue.latitude === "number" && typeof venue.longitude === "number";
  const meters = hasCoords
    ? Math.round(distanceMeters(UM_CAMPUS_CENTER, { latitude: venue.latitude!, longitude: venue.longitude! }))
    : undefined;

  return {
    venueId: venue.id ?? venue.placeId,
    venueName: venue.name,
    priceMinMYR: price.min,
    priceMaxMYR: price.max,
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

// A venue's search data that is the same for every search, worked out once per venue list. Venues with no usable
// price are left out, as no search can show them.
type IndexedVenue = { venue: Venue; price: PriceRange; match: VenueCard; searchText: string };
type VenueIndex = { venues: IndexedVenue[]; vocab: Vocabulary };

// By the list loadVenues returned (or FALLBACK_CAMPUS_VENUES), so a refreshed list gets a new index and the old
// one goes with the old list
const venueIndexes = new WeakMap<Venue[], VenueIndex>();

// The list plus the off-campus spots it doesn't already have, ready to search
function indexVenues(loaded: Venue[]): VenueIndex {
  const cached = venueIndexes.get(loaded);
  if (cached) return cached;
  const knownPlaceIds = new Set(loaded.map((v) => v.placeId).filter(Boolean));
  const all = [...loaded, ...OFF_CAMPUS_DRIVING_HOTSPOTS.filter((v) => !knownPlaceIds.has(v.placeId))];
  const index: VenueIndex = {
    venues: all.flatMap((venue) => {
      const price = venuePriceRange(venue);
      return price ? [{ venue, price, match: toVenueCard(venue, price), searchText: venueSearchText(venue) }] : [];
    }),
    vocab: buildVocabulary(all),
  };
  venueIndexes.set(loaded, index);
  return index;
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
    // Built here, in the background refresh, so no search waits for it
    if (venues.length > 0) indexVenues(venues);
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

export async function loadVenues(): Promise<Venue[]> {
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

  // 1. Load venues from Firestore (cached briefly so every tap doesn't re-read the whole collection), with their
  // search data worked out once per list
  const loaded = await loadVenues();
  const { venues, vocab } = indexVenues(loaded.length > 0 ? loaded : FALLBACK_CAMPUS_VENUES);

  // 2. Read the craving into areas and food groups: code's reading (commas split it; known area names and food
  // aliases are recognised), and the AI's when it is cached or can be fetched
  const localQuery = craving ? parseQueryLocally(craving, vocab.areas) : EMPTY_QUERY;
  let aiQuery: SearchQuery | undefined;
  const apiKey = process.env.GROQ_API_KEY;
  if (craving) {
    const key = queryKey(craving);
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
  // A venue nobody has checked for a ticked filter stays; arrangeFeed keeps it out of the top picks.
  // Venues with no coordinates are the hand-seeded on-campus ones, so the distance filter keeps them.
  const findCandidates = (q: SearchQuery): VenueMatch[] => {
    // A named area means the student wants to go there, so the distance limit doesn't apply
    const distanceLimitM = q.areas.length > 0 || maxDistanceKm === null ? null : maxDistanceKm * 1000;
    const matchGroups = compileQuery(q);
    return venues.flatMap(({ venue, price, match: base, searchText }) => {
      if (!fitsBudget(price, maxBudget)) return [];
      if (!assessDiet(venue, dietaryRestrictions).fits) return [];
      if (distanceLimitM !== null && base.distanceMeters !== undefined && base.distanceMeters > distanceLimitM) return [];
      if (q.areas.length > 0 && !(base.area && q.areas.includes(base.area))) return [];
      const { hits, exact } = matchGroups(searchText);
      if (q.groups.length > 0 && hits.length === 0) return [];
      return [{ ...base, withinBudget: budgetComfort(price, maxBudget) === 0, hits, exact }];
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

  // Ranking, the top picks and their reasons are arrangeFeed's, which the page runs on these
  return {
    matches: candidates,
    engine,
    query,
    // A reading this request had (used, or rejected for losing the search) would come back the same from the cache
    aiCanRefine: Boolean(craving && !aiQuery && apiKey && Date.now() >= aiPausedUntil),
  };
}
