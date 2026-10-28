import { describe, expect, it } from "vitest";
import type { Venue } from "@/lib/types";
import { EMPTY_QUERY, parseQueryLocally, splitPhrases, type SearchQuery } from "@/lib/search";
import { findCandidates, pickMatches, type PickParams } from "./pick";

const venue = (name: string, extra: Partial<Venue> = {}): Venue => ({
  name,
  location: "Universiti Malaya",
  priceMinMYR: 8,
  priceMaxMYR: 10,
  isHalal: "halal",
  serves: ["rice"],
  dietaryTags: [],
  menuItems: [],
  latitude: 3.1209,
  longitude: 101.6538,
  ...extra,
});

const params: PickParams = { maxBudget: 15, dietaryRestrictions: [], distanceLimitM: 3000 };

const run = (venues: Venue[], query: SearchQuery = EMPTY_QUERY, p: Partial<PickParams> = {}) =>
  pickMatches(findCandidates(venues, query, { ...params, ...p }), query);

const names = (r: ReturnType<typeof run>) => [
  r.recommendations.map((m) => m.venueName),
  r.moreMatches.map((m) => m.venueName),
];

describe("filtering", () => {
  it("drops venues whose cheapest meal is over budget", () => {
    const r = run([venue("Cheap"), venue("Dear", { priceMinMYR: 20, priceMaxMYR: 30 })]);
    expect(names(r)).toEqual([["Cheap"], []]);
  });

  it("drops venues with no price", () => {
    const r = run([venue("Nameless", { priceMinMYR: undefined, priceMaxMYR: undefined })]);
    expect(names(r)).toEqual([[], []]);
  });

  it("drops venues beyond the distance limit but keeps ones with no coordinates", () => {
    const far = venue("Far", { latitude: 3.2, longitude: 101.8 });
    const hand = venue("Seeded", { latitude: undefined, longitude: undefined });
    const r = run([far, hand], EMPTY_QUERY, { distanceLimitM: 3000 });
    expect(names(r)).toEqual([["Seeded"], []]);
  });

  it("ignores the distance limit when it is null", () => {
    const far = venue("Far", { latitude: 3.2, longitude: 101.8 });
    expect(names(run([far], EMPTY_QUERY, { distanceLimitM: null }))[0]).toEqual(["Far"]);
  });

  it("drops non-halal venues when Halal is ticked", () => {
    const r = run([venue("Pork", { isHalal: "non-halal" }), venue("Ok")], EMPTY_QUERY, {
      dietaryRestrictions: ["Halal"],
    });
    expect(names(r)).toEqual([["Ok"], []]);
  });

  it("keeps unchecked venues out of the top 3 but lists them in moreMatches", () => {
    const r = run([venue("Unchecked", { isHalal: "unknown" }), venue("Checked")], EMPTY_QUERY, {
      dietaryRestrictions: ["Halal"],
    });
    expect(names(r)).toEqual([["Checked"], ["Unchecked"]]);
  });
});

describe("search text", () => {
  it("keeps only venues matching a food group", () => {
    const q = parseQueryLocally("noodles", []);
    const r = run([venue("Rice Place"), venue("Mee Place", { serves: ["noodles"] })], q);
    expect(names(r)).toEqual([["Mee Place"], []]);
  });

  it("keeps only venues in a named area", () => {
    const q: SearchQuery = { areas: ["SS2"], groups: [] };
    const r = run([venue("Near"), venue("There", { location: "Jalan SS2/66, SS2, Petaling Jaya" })], q);
    expect(names(r)[0]).toEqual(["There"]);
  });

  it("splits a phrase into words when the whole phrase finds nothing", () => {
    const whole: SearchQuery = { areas: [], groups: [{ label: "chinese rice", terms: ["chinese rice"] }] };
    const venues = [venue("Wok", { serves: ["rice"], cuisine: "chinese" })];
    expect(run(venues, whole)).toEqual({ recommendations: [], moreMatches: [] });
    const split = splitPhrases(whole);
    expect(split).toBeDefined();
    expect(run(venues, split!).recommendations).toHaveLength(1);
  });
});

describe("ranking", () => {
  it("puts the nearest venue first", () => {
    const far = venue("Far", { latitude: 3.135, longitude: 101.6538 });
    const near = venue("Near");
    expect(names(run([far, near]))[0]).toEqual(["Near", "Far"]);
  });

  it("puts at most one branch per chain in the top 3", () => {
    const venues = [venue("KFC One"), venue("KFC Two"), venue("Nasi Corner", { latitude: 3.125 })];
    const [top, more] = names(run(venues));
    expect(top.filter((n) => n.startsWith("KFC"))).toHaveLength(1);
    expect(top).toHaveLength(2);
    expect(more).toHaveLength(1);
  });

  it("gives every recommendation a reason with price and distance", () => {
    const [rec] = run([venue("Cheap")]).recommendations;
    expect(rec.reasoning).toMatch(/RM8-10/);
    expect(rec.reasoning).toMatch(/campus centre/);
  });

  it("returns at most 3 recommendations and puts the rest in moreMatches", () => {
    const venues = ["A", "B", "C", "D", "E"].map((n, i) => venue(`${n} Cafe${i}`, { latitude: 3.1209 + i * 0.003 }));
    const r = run(venues);
    expect(r.recommendations).toHaveLength(3);
    expect(r.moreMatches).toHaveLength(2);
  });
});
