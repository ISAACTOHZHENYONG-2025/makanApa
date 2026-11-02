// Chains whose branches are listed as separate venues, by how their names start once normalised (lowercase,
// punctuation as spaces, so "Domino's" is "domino s" and "A&W" is "a w"). Only a listed chain groups its branches:
// guessing a chain from the first word joined unrelated places ("Little Heritage House" and "Little Jakarta",
// "A Tavola" and "A&W"), and from the first two words still missed "ZUS Signature Coffee" and "KFC Gateway Mall".
// A chain missing here only means two of its branches can both make the top 3. Add one when a new chain is imported.
const KNOWN_CHAINS = [
  "a w", "boost juice", "burger king", "chatime", "domino s", "gigi coffee", "kfc", "kyochon", "la chica",
  "luckin", "marrybrown", "mcdonald s", "mixue", "nando s", "original penang kayu", "papasan", "pizza hut",
  "secret recipe", "starbucks", "subway", "tealive", "texas chicken", "the coffee bean", "three guys",
  "uncle don s", "yonny", "zus",
];

// Branches of one chain share a key: "KFC Jalan Universiti DT" and "KFC Gateway Mall" are both "kfc". Any other
// venue's key is its whole name, so it is a chain of one. Used by the server's top 3 and the feed's diet filter.
export function chainKey(name: string) {
  const normalised = name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const chain = KNOWN_CHAINS.find((c) => normalised === c || normalised.startsWith(`${c} `));
  // A name in another script normalises to nothing; its own text keeps it apart from other such names
  return chain ?? (normalised || name.trim());
}
