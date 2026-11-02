export type FilterDraft = {
  craving: string;
  budget: number;
  // Straight-line distance from the campus centre; null means any distance
  maxDistanceKm: number | null;
  tags: string[];
};

export const DEFAULT_FILTERS: FilterDraft = {
  craving: "",
  budget: 15,
  maxDistanceKm: 3,
  tags: ["Halal"],
};

export const BUDGET_RANGE = { min: 5, max: 30 };

export const DISTANCE_OPTIONS: { km: number | null; param: string; label: string }[] = [
  { km: 1, param: "1", label: "1 km" },
  { km: 3, param: "3", label: "3 km" },
  { km: 5, param: "5", label: "5 km" },
  { km: null, param: "any", label: "Any" },
];

// Pick one, both or neither; both and neither both mean "either".
export const HALAL_OPTIONS = [
  { id: "Halal", label: "Halal" },
  { id: "Non-Halal", label: "Non-halal" },
];

export const DIET_TOGGLES = [
  { id: "Vegetarian", label: "Vegetarian" },
  { id: "No Seafood", label: "No Seafood" },
];

export const DIET_TAGS = [...HALAL_OPTIONS, ...DIET_TOGGLES];

// Filters travel from /filter to / in the URL so the home page can fetch with them.
export function filtersToSearchParams(filters: FilterDraft): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.craving.trim()) params.set("craving", filters.craving.trim());
  params.set("budget", String(filters.budget));
  params.set("dist", DISTANCE_OPTIONS.find((o) => o.km === filters.maxDistanceKm)?.param ?? "3");
  params.set("tags", filters.tags.join(","));
  return params;
}

type SearchParams = Record<string, string | string[] | undefined>;

export function filtersFromSearchParams(params: SearchParams): FilterDraft {
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const budget = Number(get("budget"));
  const dist = DISTANCE_OPTIONS.find((o) => o.param === get("dist"));
  const tags = get("tags");

  return {
    craving: (get("craving") ?? "").slice(0, 100),
    budget:
      Number.isFinite(budget) && budget >= BUDGET_RANGE.min && budget <= BUDGET_RANGE.max
        ? budget
        : DEFAULT_FILTERS.budget,
    maxDistanceKm: dist ? dist.km : DEFAULT_FILTERS.maxDistanceKm,
    tags:
      tags === undefined
        ? DEFAULT_FILTERS.tags
        : tags.split(",").filter((tag) => DIET_TAGS.some((t) => t.id === tag)),
  };
}
