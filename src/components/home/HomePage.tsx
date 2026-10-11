"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DecideResponseData, RecommendationItem, VenueMatch } from "@/app/api/decide/route";
import BottomNav from "@/components/layout/BottomNav";
import { decide, toDecidePayload } from "@/lib/apiClient";
import { chainKey } from "@/lib/chains";
import { assessDiet } from "@/lib/diet";
import { filtersToSearchParams, type FilterDraft } from "@/lib/filters";
import { formatDistance } from "@/lib/geo";
import FilterBottomSheet from "./FilterBottomSheet";
import FoodMatchCard from "./FoodMatchCard";
import HomeHeader from "./HomeHeader";
import MaterialIcon from "@/components/ui/MaterialIcon";
import MoreMatchesList from "./MoreMatchesList";
import SkeletonCard from "./SkeletonCard";
import { fromRecommendation, priceLabel } from "./foodMatch";

type Status = "loading" | "ready" | "error";

type HomePageProps = {
  initialFilters: FilterDraft;
  // The first results, worked out on the server with the page; absent if that failed
  initialData?: DecideResponseData;
};

// Filter changes that need a refetch. A newly ticked diet tag doesn't: the feed hides non-matching cards itself.
function countChanges(applied: FilterDraft, fetched: FilterDraft) {
  const a = toDecidePayload(applied);
  const b = toDecidePayload(fetched);
  let changes = 0;
  if (applied.craving.trim().toLowerCase() !== fetched.craving.trim().toLowerCase()) changes++;
  if (a.maxBudget !== b.maxBudget) changes++;
  if (a.maxDistanceKm !== b.maxDistanceKm) changes++;
  // An unticked diet tag does: the server left out the venues it would bring back
  if (b.dietaryRestrictions.some((tag) => !a.dietaryRestrictions.includes(tag))) changes++;
  return changes;
}

// What went wrong and what to do, in plain words; the technical detail goes to the console.
// fetch() itself throws a TypeError when the request never reaches the server.
function friendlyError(err: unknown) {
  if (err instanceof TypeError || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return "Couldn't reach makanApa. Check your connection and try again.";
  }
  return "Something went wrong on our side. Try again in a moment.";
}

// "Why this pick" for a venue moved up from See more, which the server sent without one: its wording, less what
// the venue matched in the search, e.g. "3.4 km from campus centre, RM8-12, all within budget, halal."
function promotedReason(match: VenueMatch) {
  const parts = [`${priceLabel(match)}, ${match.withinBudget ? "all" : "cheaper meals"} within budget`];
  if (match.distanceMeters !== undefined) parts.unshift(`${formatDistance(match.distanceMeters)} from campus centre`);
  if (match.isHalal) parts.push("halal");
  if (match.rating) parts.push(`rated ${match.rating.toFixed(1)}`);
  return `${parts.join(", ")}.`;
}

export default function HomePage({ initialFilters, initialData }: HomePageProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  // Set when the header search bar opens the sheet, so the craving box gets the cursor
  const [focusCraving, setFocusCraving] = useState(false);
  const [applied, setApplied] = useState<FilterDraft>(initialFilters);
  const [draft, setDraft] = useState<FilterDraft>(initialFilters);
  const [fetchedFor, setFetchedFor] = useState<FilterDraft | null>(initialData ? initialFilters : null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(initialData?.recommendations ?? []);
  const [fetchedMoreMatches, setFetchedMoreMatches] = useState<VenueMatch[]>(initialData?.moreMatches ?? []);
  const [query, setQuery] = useState<DecideResponseData["query"] | null>(initialData?.query ?? null);
  const [showMore, setShowMore] = useState(false);
  const [status, setStatus] = useState<Status>(initialData ? "ready" : "loading");
  const [error, setError] = useState("");
  // The AI is still reading the search text; the quick results are already showing
  const [refining, setRefining] = useState(false);
  const latestRequest = useRef(0);

  // The AI's reading of the craving (spelling fixes, synonyms, "chinese rice" as two things), when the server says
  // one could still change the quick results; on any failure the quick results stay
  const refine = useCallback(async (requestId: number, filters: FilterDraft, quick: DecideResponseData) => {
    if (!quick.aiCanRefine) return;
    setRefining(true);
    try {
      const smart = await decide(toDecidePayload(filters));
      if (requestId !== latestRequest.current || smart.engine !== "ai") return;
      setRecommendations(smart.recommendations);
      setFetchedMoreMatches(smart.moreMatches);
      setQuery(smart.query);
    } catch {
      // Keep the quick results
    } finally {
      // A newer search has its own hint
      if (requestId === latestRequest.current) setRefining(false);
    }
  }, []);

  const loadMatches = useCallback(
    async (filters: FilterDraft) => {
      const requestId = ++latestRequest.current;
      let quick: DecideResponseData;
      try {
        // Code's reading of the craving first, so the page never waits on the AI
        quick = await decide({ ...toDecidePayload(filters), skipAi: true });
        if (requestId !== latestRequest.current) return;
        setRecommendations(quick.recommendations);
        setFetchedMoreMatches(quick.moreMatches);
        setQuery(quick.query);
        setShowMore(false);
        setFetchedFor(filters);
        setRefining(false);
        setStatus("ready");
      } catch (err) {
        if (requestId !== latestRequest.current) return;
        console.error("Could not load recommendations:", err);
        setError(friendlyError(err));
        setStatus("error");
        return;
      }
      await refine(requestId, filters, quick);
    },
    [refine],
  );

  useEffect(() => {
    // The server usually sent the quick results with the page; then only the AI's reading is left to fetch.
    // Apart from the "Refining…" hint, state is only set after a request resolves.
    if (initialData) {
      void refine(++latestRequest.current, initialFilters, initialData);
    } else {
      void loadMatches(initialFilters);
    }
  }, [initialData, initialFilters, loadMatches, refine]);

  const dietFilter = toDecidePayload(applied).dietaryRestrictions;
  // The budget the server used
  const fetchedBudget = fetchedFor ? toDecidePayload(fetchedFor).maxBudget : 0;
  // Venues known to break a ticked filter are hidden. Venues nobody has checked for one stay, but only under
  // See more with a label, after the confirmed ones. Only confirmed venues become top matches.
  const assess = <T extends VenueMatch>(items: T[]) =>
    items.map((item) => ({ item, ...assessDiet(item.diet, dietFilter) })).filter((entry) => entry.fits);
  const assessedTop = assess(recommendations);
  const assessedMore = assess(fetchedMoreMatches);
  const confirmedTop = assessedTop.filter((entry) => entry.unconfirmed.length === 0);
  const confirmedMore = assessedMore.filter((entry) => entry.unconfirmed.length === 0);
  // Top picks a newly ticked tag hid are filled from See more's confirmed venues, in the server's order and, like
  // the server's top 3, one branch per chain
  const topChains = new Set(confirmedTop.map((entry) => chainKey(entry.item.venueName)));
  const promoted = new Set<VenueMatch>();
  for (const { item } of confirmedMore) {
    if (confirmedTop.length + promoted.size >= 3) break;
    const key = chainKey(item.venueName);
    if (topChains.has(key)) continue;
    topChains.add(key);
    promoted.add(item);
  }
  const matches = [
    ...confirmedTop.map((entry) => entry.item),
    ...[...promoted].map((item) => ({ ...item, reasoning: promotedReason(item) })),
  ].map((item, index) => fromRecommendation(item, index, fetchedBudget));
  const moreMatches = [
    ...confirmedMore.filter((entry) => !promoted.has(entry.item)),
    ...[...assessedTop, ...assessedMore].filter((entry) => entry.unconfirmed.length > 0),
  ].map(({ item, unconfirmed }) => ({ match: item as VenueMatch, unconfirmed }));

  const openSheet = (focus: boolean) => {
    setDraft(applied);
    setFocusCraving(focus);
    setSheetOpen(true);
  };

  const search = (filters: FilterDraft) => {
    setStatus("loading");
    void loadMatches(filters);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  // From the sheet's "Show results", or a header chip's remove button
  const applyFilters = (next: FilterDraft) => {
    setApplied(next);
    setSheetOpen(false);
    // Keeps the filters on refresh. replaceState neither reloads nor remounts the page.
    window.history.replaceState(null, "", `/?${filtersToSearchParams(next).toString()}`);
    // A newly ticked diet tag only hides cards, so it needs no request
    if (!fetchedFor || countChanges(next, fetchedFor) > 0) search(next);
  };

  const topCount = matches.length;
  const moreCount = moreMatches.length;
  const countLabel = `${topCount} top pick${topCount === 1 ? "" : "s"}${moreCount > 0 ? ` · ${moreCount} more` : ""}`;
  const announcement =
    status === "loading"
      ? "Finding meals…"
      : status === "error"
        ? `Couldn't load recommendations. ${error}`
        : countLabel.replace(" · ", ", ");

  // The sticky bar only shows when it says something the header doesn't: a search in progress, or a retry after an
  // error. With results showing, the header's search bar and Filters chip already open the sheet.
  // It is disabled while loading, so its only action is the retry.
  const barLabel = status === "error" ? "Try again" : status === "loading" ? "Finding meals…" : undefined;
  // What the craving was read as, e.g. ["Section 17", "chinese", "rice"]
  const queryTags = query ? [...query.areas, ...query.groups.map((g) => g.label)] : [];
  // Not while a new search is loading: the old request's flag may still be set
  const showRefining = refining && status !== "loading";

  return (
    <div className="bg-surface-container text-on-surface antialiased min-h-dvh flex justify-center">
      <div className="w-full max-w-[420px] bg-background min-h-dvh flex flex-col relative shadow-2xl">
        <HomeHeader
          filters={applied}
          onChange={applyFilters}
          onOpenFilters={() => openSheet(false)}
          onOpenSearch={() => openSheet(true)}
        />

        {/* Room for the last card to scroll clear of the sticky bar, when it shows */}
        <main className={`flex-1 px-3 pt-3 flex flex-col gap-3 ${barLabel ? "pb-24" : "pb-6"}`}>
          <p aria-live="polite" className="sr-only" role="status">
            {announcement}
          </p>

          <div className="flex items-center justify-between px-1">
            <h2 className="text-[15px] font-extrabold text-on-surface tracking-tight">Top picks</h2>
            {status === "ready" ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-tint text-primary-ink tabular-nums">
                {countLabel}
              </span>
            ) : null}
          </div>

          {queryTags.length > 0 || showRefining ? (
            <div className="flex items-start justify-between gap-2 px-1 -mt-1">
              <div aria-label="Searching for" className="flex flex-wrap gap-1">
                {queryTags.map((tag) => (
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-[6px] bg-surface-container text-on-surface-variant"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {showRefining ? (
                <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant py-0.5">
                  <MaterialIcon name="progress_activity" className="text-[14px] motion-safe:animate-spin" />
                  Refining…
                </span>
              ) : null}
            </div>
          ) : null}

          {status === "loading" && matches.length === 0 ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : null}

          {status === "error" ? (
            <div className="rounded-2xl border border-error/30 bg-error-container p-4 text-on-error-container" role="alert">
              <p className="text-sm font-bold">Couldn&apos;t load recommendations</p>
              <p className="text-xs mt-1">{error}</p>
              <button
                className="mt-3 h-9 px-4 rounded-full bg-error text-on-error text-xs font-bold active:scale-95 transition-transform"
                onClick={() => search(applied)}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : null}

          {status === "ready" && matches.length === 0 && moreMatches.length > 0 ? (
            <div className="rounded-2xl border border-hairline bg-surface-container-lowest p-4 text-center">
              <p className="text-sm font-bold">No confirmed matches</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Nothing here is confirmed for your diet choices yet. See more shows venues still to be checked.
              </p>
              {!showMore ? (
                <button
                  className="mt-3 h-9 px-4 rounded-full border-[1.5px] border-primary text-primary-ink text-xs font-bold hover:bg-primary-tint active:scale-95 transition-transform tabular-nums"
                  onClick={() => setShowMore(true)}
                  type="button"
                >
                  Show {moreCount} unconfirmed
                </button>
              ) : null}
            </div>
          ) : null}

          {status === "ready" && matches.length === 0 && moreMatches.length === 0 ? (
            <div className="rounded-2xl border border-hairline bg-surface-container-lowest p-4 text-center">
              <p className="text-sm font-bold">No matches for these filters</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Try another craving, a higher budget, or a longer distance.
              </p>
              <button
                className="mt-3 h-9 px-4 rounded-full border-[1.5px] border-primary text-primary-ink text-xs font-bold hover:bg-primary-tint active:scale-95 transition-transform"
                onClick={() => openSheet(false)}
                type="button"
              >
                Adjust filters
              </button>
            </div>
          ) : null}

          <div
            aria-busy={status === "loading"}
            className={`flex flex-col gap-3 transition-opacity ${status === "loading" ? "opacity-50" : ""}`}
          >
            {matches.map((match) => (
              <FoodMatchCard
                insightLabel="Why this pick"
                key={match.id}
                match={match}
              />
            ))}

            {moreMatches.length > 0 ? (
              <button
                aria-expanded={showMore}
                className="h-12 rounded-full border-[1.5px] border-primary text-primary-ink text-sm font-bold flex items-center justify-center gap-1 hover:bg-primary-tint active:scale-[0.98] transition-transform tabular-nums"
                onClick={() => setShowMore((open) => !open)}
                type="button"
              >
                <span>{showMore ? "Show less" : `See more (${moreMatches.length})`}</span>
                <MaterialIcon name={showMore ? "expand_less" : "expand_more"} className="text-[18px]" />
              </button>
            ) : null}

            {showMore ? <MoreMatchesList items={moreMatches} /> : null}
          </div>
        </main>

        <BottomNav
          active="explore"
          actionLabel={barLabel}
          disabled={status === "loading"}
          onAction={() => search(applied)}
        />

        <FilterBottomSheet
          draft={draft}
          focusCraving={focusCraving}
          onApply={() => applyFilters(draft)}
          onChange={setDraft}
          onClose={() => setSheetOpen(false)}
          open={sheetOpen}
        />
      </div>
    </div>
  );
}
