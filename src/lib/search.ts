import { matchArea } from "./area";
import type { Venue } from "./types";

// What the search box means: areas the venue must be in, and food groups it should match. One group per thing
// the student typed ("chinese", "rice"); a venue matches a group when any of its terms is in the venue's text.
export interface SearchQuery {
  areas: string[];
  groups: { label: string; terms: string[] }[];
}

export const EMPTY_QUERY: SearchQuery = { areas: [], groups: [] };

const PLACEHOLDER_MENU_ITEM = "Typical meal";

// What students type → words that show up in venue names, cuisines, serves and menus: a dish's other names (Malay,
// Chinese, other spellings), and what a cuisine or kind of food usually covers. The AI does this better; this is
// the instant reading and the fallback.
const CRAVING_ALIASES: Record<string, string[]> = {
  // Kinds of food and places
  noodle: ["mee", "mi", "kuey teow", "koay teow", "hor fun", "laksa", "ramen", "udon", "pho", "bihun", "bee hoon", "maggi", "indomie", "pasta", "yee mee", "mee sua", "lai fun", "面", "麵"],
  rice: ["nasi", "biryani", "briyani", "donburi"],
  soup: ["sup", "汤", "湯"],
  "fast food": ["burger", "fried chicken", "mcdonald", "kfc", "pizza"],
  mcd: ["mcdonald"],
  western: ["chicken chop", "burger", "pasta", "steak"],
  coffee: ["cafe", "coffee shop", "kopi", "kopitiam"],
  cafe: ["coffee"],
  kopitiam: ["kedai kopi", "coffee shop", "茶室", "茶餐室", "茶餐厅", "茶餐廳"],
  kopi: ["coffee", "kopitiam", "kedai kopi"],
  "kedai kopi": ["kopitiam", "coffee shop"],
  hawker: ["hawker stalls", "hawker food", "food court", "kopitiam"],
  "food court": ["hawker"],
  "street food": ["hawker", "lok lok"],
  bread: ["bakery", "roti", "pastry", "bun"],
  bakery: ["bread", "pastry", "cake", "bakes"],
  dessert: ["cendol", "ais kacang", "ice cream", "gelato", "cake", "tong sui", "tau fu fah", "bingsu", "kakigori", "shaved ice", "waffle", "糖水"],
  "ice cream": ["gelato"],
  "bubble tea": ["boba", "milk tea", "tealive", "chatime"],
  boba: ["bubble tea", "milk tea"],
  mamak: ["roti canai", "nasi kandar", "mee goreng mamak", "teh tarik"],
  seafood: ["crab", "lala", "shell out", "ikan bakar", "海鲜", "海鮮"],
  chicken: ["ayam", "鸡", "雞"],
  duck: ["itik", "鸭", "鴨"],
  fish: ["ikan", "鱼", "魚"],
  pork: ["char siu", "siu yuk", "bak kut teh", "pork noodle", "pork ribs", "pork leg", "pork knuckle", "iberico"],
  beef: ["steak", "brisket", "牛肉", "牛腩"],
  lamb: ["mutton", "kambing", "羊"],
  mutton: ["lamb", "kambing", "羊"],
  vegetarian: ["vegan", "meatless", "素食", "斋", "齋"],
  // Dishes by their other names
  bakuteh: ["bak kut teh", "bah kut teh", "肉骨茶"],
  bkt: ["bak kut teh", "bah kut teh", "肉骨茶"],
  "bak kut teh": ["bah kut teh", "肉骨茶"],
  "bah kut teh": ["bak kut teh", "肉骨茶"],
  "chicken rice": ["nasi ayam", "鸡饭", "雞飯"],
  "nasi ayam": ["chicken rice", "鸡饭", "雞飯"],
  "mixed rice": ["economy rice", "nasi campur", "chap fan", "杂饭", "雜飯", "经济饭", "菜饭"],
  "economy rice": ["mixed rice", "nasi campur", "chap fan", "杂饭", "雜飯", "经济饭", "菜饭"],
  "nasi campur": ["mixed rice", "economy rice"],
  "chap fan": ["mixed rice", "economy rice", "杂饭"],
  "fried rice": ["nasi goreng", "炒饭", "炒飯"],
  "nasi goreng": ["fried rice"],
  "fried noodle": ["mee goreng", "fried mee", "fried bihun", "char kuey teow"],
  "mee goreng": ["fried noodle", "fried mee"],
  "char kuey teow": ["char kway teow", "char koay teow", "炒粿条", "炒粿條"],
  "char kway teow": ["char kuey teow", "char koay teow", "炒粿条"],
  "char koay teow": ["char kuey teow", "char kway teow", "炒粿条"],
  ckt: ["char kuey teow", "char kway teow", "char koay teow"],
  "wantan mee": ["wan tan mee", "wonton mee", "wonton noodle", "云吞面", "雲吞麵"],
  "wan tan mee": ["wantan mee", "wonton mee", "云吞面"],
  "wonton mee": ["wantan mee", "wan tan mee", "云吞面"],
  "pan mee": ["板面", "板麵"],
  "curry mee": ["curry noodle", "curry laksa", "咖喱面", "咖喱麵"],
  "curry laksa": ["curry mee", "curry noodle"],
  "prawn mee": ["prawn noodle", "虾面", "蝦麵"],
  "hokkien mee": ["hokkien fried mee", "福建面", "福建麵"],
  "yong tau foo": ["yong tau fu", "酿豆腐", "釀豆腐"],
  ytf: ["yong tau foo", "yong tau fu"],
  "dim sum": ["dimsum", "点心", "點心"],
  dimsum: ["dim sum", "点心"],
  hotpot: ["hot pot", "steamboat", "malatang", "火锅", "火鍋"],
  "hot pot": ["hotpot", "steamboat", "火锅"],
  steamboat: ["hotpot", "hot pot", "火锅"],
  malatang: ["mala tang", "麻辣烫", "麻辣燙"],
  mala: ["malatang", "mala xiang guo", "麻辣"],
  porridge: ["congee", "bubur", "粥"],
  congee: ["porridge", "粥"],
  "roast duck": ["roasted duck", "烧鸭", "燒鴨"],
  "roast pork": ["siu yuk", "siew yuk", "siew yoke", "烧肉", "燒肉"],
  "char siu": ["char siew", "叉烧", "叉燒"],
  "char siew": ["char siu", "叉烧"],
  "roast meat": ["roasted meat", "roast duck", "roast pork", "char siu", "烧腊", "燒臘"],
  "nasi lemak": ["椰浆饭"],
  "roti canai": ["roti", "prata"],
  biryani: ["briyani", "beriani"],
  briyani: ["biryani", "beriani"],
  thosai: ["dosa", "dosai"],
  dosa: ["thosai", "dosai"],
  satay: ["sate"],
  "tom yam": ["tomyam", "tom yum", "tomyum"],
  tomyam: ["tom yam", "tom yum"],
  "tom yum": ["tom yam", "tomyam"],
  "pad kra pao": ["pad kaprao", "pad krapow", "pakapau", "basil chicken"],
  // Cuisines, also typed as the country
  thai: ["thailand", "tom yam", "tomyam", "mookata", "pad thai", "pad kra pao", "pad kaprao", "som tam", "boat noodle"],
  thailand: ["thai", "tom yam", "tomyam", "mookata", "pad thai"],
  vietnamese: ["vietnam", "viet", "pho", "banh mi", "bun cha", "越南"],
  vietnam: ["vietnamese", "viet", "pho", "banh mi", "越南"],
  japanese: ["japan", "sushi", "sashimi", "ramen", "izakaya", "donburi", "bento", "yakitori", "yakiniku", "udon", "日式"],
  japan: ["japanese", "sushi", "ramen", "日式"],
  korean: ["korea", "korean bbq", "kbbq", "kimchi", "bibimbap", "tteokbokki", "韩式", "韓式"],
  korea: ["korean", "kimchi", "韩式"],
  chinese: ["china", "cantonese", "hakka", "teochew", "hainanese", "hokkien", "sichuan", "hunan", "shanghainese"],
  china: ["chinese"],
  indian: ["india", "banana leaf", "nasi kandar", "briyani", "biryani", "thosai", "naan", "tandoori", "chapathi", "chettinad"],
  india: ["indian", "banana leaf", "nasi kandar"],
  malay: ["melayu", "nasi lemak", "nasi campur", "nasi kerabu", "ayam penyet", "ayam gepuk", "kampung", "kelantan"],
  malaysian: ["malay", "local", "nasi lemak", "kopitiam", "mamak"],
  local: ["malaysian", "hawker", "kopitiam"],
  indonesian: ["indonesia", "padang", "ayam penyet", "ayam gepuk", "penyet"],
  indonesia: ["indonesian", "padang", "ayam penyet"],
  taiwanese: ["taiwan", "lu rou fan", "braised pork rice", "台湾", "台灣"],
  taiwan: ["taiwanese", "台湾", "台灣"],
  "hong kong": ["hongkong", "cantonese", "茶餐厅", "茶餐廳", "港式"],
  nyonya: ["peranakan", "nonya", "baba"],
  peranakan: ["nyonya", "nonya"],
  italian: ["italy", "pasta", "pizza", "trattoria"],
  italy: ["italian", "pasta", "pizza"],
  mexican: ["mexico", "taco", "burrito"],
  mexico: ["mexican", "taco", "burrito"],
  french: ["france", "bistro", "croissant"],
  "middle eastern": ["arab", "arabic", "lebanese", "turkish", "yemeni", "mandi", "shawarma", "kebab"],
  arab: ["arabic", "middle eastern", "mandi", "shawarma", "kebab"],
  spanish: ["spain", "tapas", "paella"],
  filipino: ["philippines"],
};

// Terms too generic to narrow anything down; dropped wherever they come from, and from around a phrase
// ("thai cuisine" is "thai").
const GENERIC_TERMS = new Set([
  "food", "restaurant", "restoran", "meal", "eat", "makan", "place", "shop", "kedai", "stall", "near", "nearby",
  "cuisine", "masakan", "dish", "dishes", "style", "cheap", "murah", "best", "good", "nice", "sedap", "tasty",
  "delicious", "now", "want", "craving", "something",
]);

const isGeneric = (word: string) => GENERIC_TERMS.has(word) || GENERIC_TERMS.has(word.replace(/s$/, ""));
const aliasesOf = (key: string) => CRAVING_ALIASES[key] ?? CRAVING_ALIASES[key.replace(/s$/, "")];

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Lowercase and drop accents from Latin letters ("Café" -> "cafe") so spellings match; other scripts are kept.
export function fold(text: string) {
  return text
    .normalize("NFKD")
    .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
    .normalize("NFKC")
    .toLowerCase();
}

const isLatin = (term: string) => !/[^\p{Script=Latin}\p{N}\s]/u.test(term);

// A search term as matched: folded, punctuation dropped. Undefined for empty, generic or (Latin) under-3-letter
// terms that would match too much.
export function normaliseTerm(term: string): string | undefined {
  const key = fold(term).replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/\s+/g, " ").trim();
  if (!key || isGeneric(key)) return undefined;
  if (isLatin(key) && key.replace(/ /g, "").length < 3 && key !== "mi") return undefined;
  return key;
}

function termPattern(term: string): RegExp {
  // Latin terms must match whole words ("rice" is not "price"), singular or plural ("noodles" finds "noodle").
  // Other scripts (Chinese, Japanese, ...) don't put spaces between words, so they match anywhere in the text.
  if (!isLatin(term)) return new RegExp(escapeRegExp(term), "iu");
  const stem = escapeRegExp(term.length > 3 ? term.replace(/s$/, "") : term);
  return new RegExp(`(?<![\\p{L}\\p{N}])${stem}s?(?![\\p{L}\\p{N}])`, "iu");
}

// One food group from what the student typed: the term itself plus its known aliases. Generic words in a phrase
// are dropped ("thai food" is "thai") unless the whole phrase is a known one ("fast food", "food court").
function groupFor(text: string): SearchQuery["groups"][number] | undefined {
  const typed = normaliseTerm(text);
  if (!typed) return undefined;
  const key = aliasesOf(typed) ? typed : normaliseTerm(typed.split(" ").filter((word) => !isGeneric(word)).join(" "));
  if (!key) return undefined;
  const terms = [key, ...(aliasesOf(key) ?? []).map(normaliseTerm).filter((t): t is string => !!t)];
  return { label: key, terms: [...new Set(terms)] };
}

// Split on commas, "+", "/", ";" and " and " so "sec17, chinese, rice" is three things.
const SEPARATORS = /\s*(?:[,+/;]|\band\b|&)\s*/i;

// The instant reading of the search box, with no AI: each separated piece is an area or a food group. Without
// separators ("sec17 chinese rice") any area words are pulled out and the rest is one phrase.
export function parseQueryLocally(text: string, knownAreas: readonly string[]): SearchQuery {
  const areas: string[] = [];
  const groups: SearchQuery["groups"] = [];
  const pieces = text.split(SEPARATORS).map((p) => p.trim()).filter(Boolean);

  for (const piece of pieces) {
    const area = matchArea(piece, knownAreas);
    if (area) {
      areas.push(area);
      continue;
    }
    // Pull area words out of a longer piece: try 3-, 2- then 1-word spans
    const words = piece.split(/\s+/);
    const rest: string[] = [];
    for (let i = 0; i < words.length; ) {
      let found = 0;
      for (let n = Math.min(3, words.length - i); n >= 1 && !found; n--) {
        const hit = matchArea(words.slice(i, i + n).join(" "), knownAreas);
        if (hit) {
          areas.push(hit);
          found = n;
        }
      }
      if (found) i += found;
      else rest.push(words[i++]);
    }
    const group = rest.length > 0 ? groupFor(rest.join(" ")) : undefined;
    if (group) groups.push(group);
  }
  return { areas: [...new Set(areas)], groups };
}

// Code's reading keeps "chinese rice" as one phrase, which is right for "chicken rice" but finds nothing for
// "chinese rice". This splits multi-word groups into one group per word, for a retry when the phrase found nothing.
// Known dishes stay whole: "wantan mee" split into "wantan" and "mee" would find any noodle stall. Undefined when
// there is no phrase to split.
export function splitPhrases(query: SearchQuery): SearchQuery | undefined {
  const splittable = (label: string) => label.includes(" ") && !aliasesOf(label);
  if (!query.groups.some((g) => splittable(g.label))) return undefined;
  const groups = query.groups.flatMap((g) =>
    splittable(g.label) ? g.label.split(" ").flatMap((word) => groupFor(word) ?? []) : [g],
  );
  const unique = groups.filter((g, i) => groups.findIndex((other) => other.label === g.label) === i);
  return { areas: query.areas, groups: unique };
}

// Everything a venue can be found by, folded once. Serves is the checked list from the venues sheet, so Google's
// summary only stands in while it is blank, and Google's tags never count: a "Vegetarian" tag only means Google saw
// one veg dish. "halal", "vegetarian" and "vegan" come from the sheet's checked diet answers instead.
export function venueSearchText(venue: Venue) {
  const serves = (venue.serves ?? []).filter((s) => s !== "unknown");
  return fold(
    [
      venue.name,
      venue.cuisine ?? "",
      ...serves,
      serves.length > 0 ? "" : (venue.description ?? ""),
      venue.isHalal === "halal" ? "halal" : "",
      venue.vegetarian === "yes" || venue.vegan === "yes" ? "vegetarian" : "",
      venue.vegan === "yes" ? "vegan" : "",
      ...(venue.menuItems ?? []).map((m) => m.itemName).filter((name) => name !== PLACEHOLDER_MENU_ITEM),
    ].join(" | "),
  );
}

// Compiles a query once per request. The matcher gives the labels of the food groups a venue hits, and how many it
// hits by the group's own label (always its first term) rather than a looser one: a "nasi lemak" venue, not just
// any "rice" place.
export function compileQuery(query: SearchQuery) {
  const groups = query.groups.map((g) => ({ label: g.label, patterns: g.terms.map(termPattern) }));
  return (searchText: string) => {
    const hits: string[] = [];
    let exact = 0;
    for (const g of groups) {
      if (g.patterns[0]?.test(searchText)) {
        hits.push(g.label);
        exact++;
      } else if (g.patterns.some((p) => p.test(searchText))) {
        hits.push(g.label);
      }
    }
    return { hits, exact };
  };
}

// Cleans an AI answer into a query: areas must be known ones, terms are normalised and capped. An empty query is a
// valid answer ("cheap food near me" names no food or place, so everything is shown); undefined means the answer
// wasn't in the expected shape.
export function sanitiseQuery(raw: unknown, knownAreas: readonly string[]): SearchQuery | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const { areas, groups } = raw as { areas?: unknown; groups?: unknown };
  if (!Array.isArray(areas) || !Array.isArray(groups)) return undefined;
  const cleanAreas = areas
    .filter((a): a is string => typeof a === "string")
    .map((a) => matchArea(a, knownAreas))
    .filter((a): a is string => !!a);
  const cleanGroups = groups
    .slice(0, 6)
    .flatMap((g) => {
      if (!g || typeof g !== "object") return [];
      const { label, terms } = g as { label?: unknown; terms?: unknown };
      const words = [label, ...(Array.isArray(terms) ? terms : [])]
        .filter((t): t is string => typeof t === "string" && t.length <= 30)
        .map(normaliseTerm)
        .filter((t): t is string => !!t);
      const unique = [...new Set(words)].slice(0, 12);
      return unique.length > 0 ? [{ label: normaliseTerm(String(label ?? "")) ?? unique[0], terms: unique }] : [];
    });
  return { areas: [...new Set(cleanAreas)], groups: cleanGroups };
}
