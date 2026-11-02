import { describe, expect, it } from "vitest";
import { arrangeFeed, type VenueMatch } from "@/lib/feed";
import { EMPTY_QUERY, type SearchQuery } from "@/lib/search";

// A confirmed-halal venue 500 m away at RM10, matching nothing in particular; tests override what they care about.
function venue(name: string, overrides: Partial<VenueMatch> = {}): VenueMatch {
  return {
    venueId: name,
    venueName: name,
    priceMinMYR: 10,
    priceMaxMYR: 10,
    withinBudget: true,
    isHalal: true,
    isVegetarian: false,
    isVegan: false,
    diet: { isHalal: "halal", vegetarian: "no", vegan: "no", noSeafoodOption: "yes" },
    serves: [],
    distanceMeters: 500,
    mapsUrl: `https://maps.example/${name}`,
    hits: [],
    exact: 0,
    ...overrides,
  };
}

const names = (items: { venueName: string }[]) => items.map((i) => i.venueName);
const feedOrder = (matches: VenueMatch[], query: SearchQuery = EMPTY_QUERY) => {
  const { topPicks, seeMore } = arrangeFeed(matches, [], query);
  return [...names(topPicks), ...names(seeMore.map((s) => s.match))];
};

describe("ranking", () => {
  it("puts venues matching more of the craving's food groups first", () => {
    const order = feedOrder([
      venue("Rice only", { hits: ["rice"], exact: 1 }),
      venue("Chinese rice", { hits: ["chinese", "rice"], exact: 2 }),
    ]);
    expect(order).toEqual(["Chinese rice", "Rice only"]);
  });

  it("then venues matching more groups by the label itself", () => {
    const order = feedOrder([
      venue("Any rice place", { hits: ["nasi lemak"], exact: 0 }),
      venue("Nasi lemak stall", { hits: ["nasi lemak"], exact: 1 }),
    ]);
    expect(order).toEqual(["Nasi lemak stall", "Any rice place"]);
  });

  it("then nearest, treating venues in the same 300 m band as equally near", () => {
    const order = feedOrder([
      venue("Far", { distanceMeters: 2000 }),
      venue("Near but lower rated", { distanceMeters: 350, rating: 3 }),
      venue("A bit further, better rated", { distanceMeters: 420, rating: 4.5 }),
    ]);
    expect(order).toEqual(["A bit further, better rated", "Near but lower rated", "Far"]);
  });

  it("treats a venue with no coordinates as 800 m away", () => {
    const order = feedOrder([
      venue("1.5 km", { distanceMeters: 1500 }),
      venue("On campus, no coordinates", { distanceMeters: undefined }),
      venue("200 m", { distanceMeters: 200 }),
    ]);
    expect(order).toEqual(["200 m", "On campus, no coordinates", "1.5 km"]);
  });

  it("then whole price range within budget, then best rated, then cheapest typical price", () => {
    const order = feedOrder([
      venue("Some meals over budget", { withinBudget: false, rating: 5 }),
      venue("Unrated", { priceMinMYR: 5, priceMaxMYR: 7 }),
      venue("Rated, dearer", { rating: 4, priceMinMYR: 10, priceMaxMYR: 14 }),
      venue("Rated, cheaper", { rating: 4, priceMinMYR: 8, priceMaxMYR: 12 }),
    ]);
    expect(order).toEqual(["Rated, cheaper", "Rated, dearer", "Unrated", "Some meals over budget"]);
  });
});

describe("top picks", () => {
  it("holds at most three venues; the rest follow in See more, in ranked order", () => {
    const { topPicks, seeMore } = arrangeFeed(
      ["A", "B", "C", "D", "E"].map((name, i) => venue(name, { distanceMeters: 100 + i * 400 })),
      [],
      EMPTY_QUERY,
    );
    expect(names(topPicks)).toEqual(["A", "B", "C"]);
    expect(names(seeMore.map((s) => s.match))).toEqual(["D", "E"]);
  });

  it("holds one branch per chain, so another venue takes the second branch's place", () => {
    const { topPicks, seeMore } = arrangeFeed(
      [
        venue("KFC Gateway Mall", { distanceMeters: 100 }),
        venue("KFC Jalan Universiti DT", { distanceMeters: 500 }),
        venue("Restoran Mahbub", { distanceMeters: 900 }),
      ],
      [],
      EMPTY_QUERY,
    );
    expect(names(topPicks)).toEqual(["KFC Gateway Mall", "Restoran Mahbub"]);
    expect(names(seeMore.map((s) => s.match))).toEqual(["KFC Jalan Universiti DT"]);
  });

  it("picks the chain's nearest branch among those matching the search as well as its best-ranked one", () => {
    const { topPicks, seeMore } = arrangeFeed(
      [
        // Nearest, but matches only one of the two food groups; Bangsar ranks first on rating, SS2 is nearer
        venue("ZUS Coffee KL Gateway", { distanceMeters: 100, hits: ["coffee"], exact: 1 }),
        venue("ZUS Coffee Bangsar", { distanceMeters: 1250, rating: 5, hits: ["coffee", "cake"], exact: 2 }),
        venue("ZUS Signature Coffee SS2", { distanceMeters: 1150, rating: 3, hits: ["coffee", "cake"], exact: 2 }),
      ],
      [],
      EMPTY_QUERY,
    );
    expect(names(topPicks)).toEqual(["ZUS Signature Coffee SS2"]);
    expect(names(seeMore.map((s) => s.match))).toEqual(["ZUS Coffee Bangsar", "ZUS Coffee KL Gateway"]);
  });
});

describe("a newly ticked filter", () => {
  it("fills a hidden top pick from See more, still one branch per chain", () => {
    const matches = [
      venue("Pork noodle shop", { distanceMeters: 100, isHalal: false, diet: { isHalal: "non-halal" } }),
      venue("KFC Gateway Mall", { distanceMeters: 200 }),
      venue("KFC Jalan Universiti DT", { distanceMeters: 250 }),
      venue("Restoran Mahbub", { distanceMeters: 900 }),
      venue("Village Park Restaurant", { distanceMeters: 1500 }),
    ];
    expect(names(arrangeFeed(matches, [], EMPTY_QUERY).topPicks)).toEqual([
      "Pork noodle shop",
      "KFC Gateway Mall",
      "Restoran Mahbub",
    ]);

    const { topPicks, seeMore } = arrangeFeed(matches, ["Halal"], EMPTY_QUERY);
    expect(names(topPicks)).toEqual(["KFC Gateway Mall", "Restoran Mahbub", "Village Park Restaurant"]);
    expect(names(seeMore.map((s) => s.match))).toEqual(["KFC Jalan Universiti DT"]);
  });
});

describe("diet filter", () => {
  const pork = venue("Pork noodle shop", { distanceMeters: 100, isHalal: false, diet: { isHalal: "non-halal" } });
  const unchecked = venue("Unchecked kopitiam", { distanceMeters: 200, isHalal: false, diet: { isHalal: "unknown" } });
  const halal = venue("Halal mamak", { distanceMeters: 2000 });

  it("leaves out a venue known to break a ticked filter", () => {
    const { topPicks, seeMore } = arrangeFeed([pork, halal], ["Halal"], EMPTY_QUERY);
    expect(names(topPicks)).toEqual(["Halal mamak"]);
    expect(seeMore).toEqual([]);
  });

  it("keeps an unconfirmed venue out of the top picks, labelled after the confirmed ones in See more", () => {
    const confirmedRest = ["B", "C", "D"].map((name) => venue(name, { distanceMeters: 2500 }));
    const { topPicks, seeMore } = arrangeFeed([unchecked, halal, ...confirmedRest], ["Halal"], EMPTY_QUERY);
    expect(names(topPicks)).toEqual(["Halal mamak", "B", "C"]);
    expect(seeMore).toEqual([
      { match: confirmedRest[2], unconfirmed: [] },
      { match: unchecked, unconfirmed: ["Halal unconfirmed"] },
    ]);
  });

  it("lists unconfirmed venues in ranked order", () => {
    const farUnchecked = venue("Far unchecked", { distanceMeters: 1800, diet: { isHalal: "unknown" } });
    const { seeMore } = arrangeFeed([farUnchecked, halal, unchecked], ["Halal"], EMPTY_QUERY);
    expect(names(seeMore.map((s) => s.match))).toEqual(["Unchecked kopitiam", "Far unchecked"]);
  });

  it("shows every venue when no filter is ticked", () => {
    const { topPicks } = arrangeFeed([pork, unchecked, halal], [], EMPTY_QUERY);
    expect(names(topPicks)).toEqual(["Pork noodle shop", "Unchecked kopitiam", "Halal mamak"]);
  });
});

describe("why this pick", () => {
  const riceInSec17: SearchQuery = { areas: ["Section 17"], groups: [{ label: "rice", terms: ["rice", "nasi"] }] };

  it("gives a venue moved up from See more by a newly ticked filter the same full reason as any top pick", () => {
    const rice = { hits: ["rice"], area: "Section 17" };
    const matches = [
      venue("Pork rice", { ...rice, distanceMeters: 100, isHalal: false, diet: { isHalal: "non-halal" } }),
      venue("Chicken rice stall", { ...rice, distanceMeters: 200 }),
      venue("Economy rice", { ...rice, distanceMeters: 250 }),
      venue("Nasi Kandar Sec 17", { ...rice, distanceMeters: 650, priceMinMYR: 8, priceMaxMYR: 12, rating: 4.2 }),
    ];
    const before = arrangeFeed(matches, [], riceInSec17);
    expect(names(before.seeMore.map((s) => s.match))).toEqual(["Nasi Kandar Sec 17"]);

    const after = arrangeFeed(matches, ["Halal"], riceInSec17);
    expect(names(after.topPicks)).toEqual(["Chicken rice stall", "Economy rice", "Nasi Kandar Sec 17"]);
    expect(after.topPicks[2].reasoning).toBe(
      "Matches rice in Section 17: 650 m from campus centre, RM8-12, all within budget, halal, rated 4.2.",
    );
  });

  it("says when only the cheaper meals are within budget, and leaves out what the venue doesn't have", () => {
    const { topPicks } = arrangeFeed(
      [venue("Western cafe", { withinBudget: false, priceMinMYR: 12, priceMaxMYR: 25, isHalal: false, distanceMeters: 3400, hits: ["rice"] })],
      [],
      { areas: [], groups: [{ label: "rice", terms: ["rice"] }] },
    );
    expect(topPicks[0].reasoning).toBe("Matches rice: 3.4 km from campus centre, RM12-25, cheaper meals within budget.");
  });

  it("leads with the area when the search named one but no food", () => {
    const { topPicks } = arrangeFeed([venue("SS2 kopitiam", { area: "SS2", distanceMeters: undefined })], [], {
      areas: ["SS2"],
      groups: [],
    });
    expect(topPicks[0].reasoning).toBe("In SS2: RM10, all within budget, halal.");
  });

  it("is just distance, price and diet for an empty search", () => {
    const { topPicks } = arrangeFeed([venue("Any place", { area: "SS2" })], [], EMPTY_QUERY);
    expect(topPicks[0].reasoning).toBe("500 m from campus centre, RM10, all within budget, halal.");
  });
});
