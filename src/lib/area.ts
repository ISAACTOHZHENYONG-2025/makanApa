// The short neighbourhood name shown on venue cards ("SS2", "Section 17", "UM"), worked out from the venue's
// Google formatted address. Google puts the neighbourhood just before the postcode:
// "22, Jalan 17/54, Seksyen 17, 46400 Petaling Jaya, Selangor, Malaysia" -> "Section 17".

// Checked first, against the whole address: places whose name beats the neighbourhood Google gives.
const LANDMARKS: [RegExp, string][] = [
  [/mid ?valley/i, "Mid Valley"],
  [/mahsa avenue|jalan ilmu/i, "MAHSA Avenue"],
  // Campus addresses, including hand-typed ones like "KK2" or "Faculty of Science"; before Bangsar South, as
  // some campus addresses also name Pantai Dalam
  [/universiti malaya|university of malaya|\b50603\b|\bppum\b|perubatan universiti|residential college|kolej kediaman|\bkk ?\d+\b|fakulti|faculty/i, "UM"],
  [/\bUM\b/, "UM"],
  [/bangsar south|kl gateway|kerinchi|pantai dalam/i, "Bangsar South"],
  [/jaya one/i, "Jaya One"],
];

// Smaller neighbourhoods folded into the area students know them by.
const ALIASES: Record<string, string> = {
  "paramount garden": "Taman Paramount",
  "bangsar baru": "Bangsar",
  "happy mansion": "Section 17",
  "taman bahagia": "SS2",
  "pjs 11": "PJS 11",
  "kl gateway": "Bangsar South",
  "kl gateway mall": "Bangsar South",
  kerinchi: "Bangsar South",
};

// Trailing segments of hand-typed addresses that name the city, not the neighbourhood.
const CITY_SEGMENT = /^(pj|petaling jaya|kuala lumpur|kl|selangor|wilayah persekutuan.*|malaysia)$/i;
const STREET = /^(jalan|jln|lorong|lrg)\b/i;
// A segment that starts with the postcode ("46400 Petaling Jaya"), or has it glued on ("Taman Gembira46400 ...").
const POSTCODE_SEGMENT = /^(?:(.*[a-z]))?\d{5}(?!\d)(?:\s|$)/i;

function normalise(area: string): string | undefined {
  let name = area
    .replace(/\(.*?\)/g, "")
    .replace(/\s+petaling jaya$/i, "")
    .replace(/^seksyen\s*/i, "Section ")
    .replace(/^ss\s*(\d+)$/i, "SS$1")
    .replace(/\s+/g, " ")
    .trim();
  if (name === name.toUpperCase() && !/^SS\d+$/.test(name)) {
    name = name.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  }
  name = ALIASES[name.toLowerCase()] ?? name;
  return name && !STREET.test(name) ? name : undefined;
}

// Words students type for campus itself
const CAMPUS_WORDS = new Set(["um", "campus", "universiti malaya", "university malaya", "university of malaya"]);

// Loose spellings fold to one key: "Sec17", "seksyen 17", "s17" -> "section 17"; "SS 2" -> "ss2".
function areaKey(text: string) {
  return text
    .toLowerCase()
    .replace(/\b(?:seksyen|section|sect|sec|sek|s)\s*(\d+[a-z]?)\b/g, "section $1")
    .replace(/\bss\s*(\d+)\b/g, "ss$1")
    .replace(/\bpjs\s*(\d+)\b/g, "pjs $1")
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// The known area a student's text names, or undefined. Matches "sec17" to "Section 17" and "paramount" to
// "Taman Paramount"; knownAreas are the names venueArea() gives.
export function matchArea(text: string, knownAreas: readonly string[]): string | undefined {
  const key = areaKey(text);
  if (!key) return undefined;
  if (CAMPUS_WORDS.has(key)) return knownAreas.find((a) => a === "UM");
  const alias = ALIASES[key];
  return knownAreas.find((area) => {
    const known = areaKey(area);
    return known === key || known.replace(/^taman /, "") === key || area === alias;
  });
}

export function venueArea(address: string | undefined): string | undefined {
  if (!address) return undefined;
  for (const [pattern, name] of LANDMARKS) if (pattern.test(address)) return name;

  const segments = address.split(",").map((s) => s.trim()).filter(Boolean);
  const postcodeAt = segments.findIndex((s) => POSTCODE_SEGMENT.test(s));
  if (postcodeAt >= 0) {
    const glued = POSTCODE_SEGMENT.exec(segments[postcodeAt])?.[1];
    if (glued) return normalise(glued);
    return postcodeAt > 0 ? normalise(segments[postcodeAt - 1]) : undefined;
  }

  // No postcode: a hand-typed address such as "Lorong Bangsar, Bangsar" or "Damansara Utama (Uptown), PJ"
  const named = segments.filter((s) => !CITY_SEGMENT.test(s));
  return named.length > 0 ? normalise(named[named.length - 1]) : undefined;
}
