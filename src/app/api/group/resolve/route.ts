import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { requireGroupEnabled } from "@/lib/featureFlags";
import { GoogleGenAI, Type } from "@google/genai";
import type { Venue } from "@/lib/types";
import { mapsUrlForVenueName } from "@/lib/mapsLinks";
import { assessDiet, mergeGroupRestrictions } from "@/lib/diet";
import { budgetComfort, fitsBudget, midpoint, venuePriceRange, type PriceRange } from "@/lib/price";
import { FALLBACK_CAMPUS_VENUES, loadVenues } from "@/lib/decide";

export interface Participant {
  memberName: string;
  maxBudget: number;
  availableTimeMins: number;
  transportMode: "walk_or_public" | "private_vehicle";
  dietaryRestrictions: string[];
}

export interface WinningRecommendation {
  venueName: string;
  recommendedItems: string[];
  totalCostPerPersonMYR: number;
  consensusReasoning: string;
  // Google Maps directions link; Maps works out the route from the user's location.
  mapsUrl?: string;
}

export interface BackupOption {
  venueName: string;
  recommendedItems: string[];
  totalCostPerPersonMYR: number;
  consensusReasoning: string;
  // Google Maps directions link; Maps works out the route from the user's location.
  mapsUrl?: string;
}

export interface GroupResolveResponse {
  winningRecommendation: WinningRecommendation;
  backupOptions: BackupOption[];
}

function withMapsUrls(result: GroupResolveResponse, venues: Venue[]): GroupResolveResponse {
  const addUrl = <T extends { venueName: string }>(pick: T) => ({
    ...pick,
    mapsUrl: mapsUrlForVenueName(pick.venueName, venues),
  });
  return {
    winningRecommendation: addUrl(result.winningRecommendation),
    backupOptions: (result.backupOptions ?? []).map(addUrl),
  };
}

export async function POST(req: NextRequest) {
  // Outside the try: this 404s by throwing, which the catch below would turn into a 500.
  requireGroupEnabled();
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Firestore is not initialized. Check .env.local configuration." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const roomCode = body.roomCode?.trim().toUpperCase();

    if (!roomCode) {
      return NextResponse.json(
        { error: "roomCode is required to resolve group consensus." },
        { status: 400 }
      );
    }

    // 1. Fetch room doc from Firestore
    const roomsRef = collection(db, "group_rooms");
    const q = query(roomsRef, where("roomCode", "==", roomCode));
    const roomSnapshot = await getDocs(q);

    if (roomSnapshot.empty) {
      return NextResponse.json(
        { error: `Group room with code '${roomCode}' not found.` },
        { status: 404 }
      );
    }

    const roomDoc = roomSnapshot.docs[0];

    // 2. Fetch all participants from sub-collection
    const participantsRef = collection(db, "group_rooms", roomDoc.id, "participants");
    const participantsSnap = await getDocs(participantsRef);

    if (participantsSnap.empty) {
      return NextResponse.json(
        { error: "Cannot resolve consensus: No participants have joined this room yet." },
        { status: 400 }
      );
    }

    const participants: Participant[] = [];
    participantsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      participants.push({
        memberName: data.memberName || "Student",
        maxBudget: Number(data.maxBudget ?? 15),
        availableTimeMins: Number(data.availableTimeMins ?? 30),
        transportMode: data.transportMode === "private_vehicle" ? "private_vehicle" : "walk_or_public",
        dietaryRestrictions: Array.isArray(data.dietaryRestrictions) ? data.dietaryRestrictions : [],
      });
    });

    // 3. Aggregate group constraints
    const strictBudgetCap = Math.min(...participants.map((p) => p.maxBudget));
    const strictTimeLimit = Math.min(...participants.map((p) => p.availableTimeMins));
    const hasWalkOnly = participants.some((p) => p.transportMode === "walk_or_public");
    const transportBottleneck: "walk_or_public" | "private_vehicle" = hasWalkOnly
      ? "walk_or_public"
      : "private_vehicle";

    // If any member picked Halal only, the whole group is halal-first. Otherwise the members' other filters add up.
    const mergedDietaryRestrictions = mergeGroupRestrictions(participants.map((p) => p.dietaryRestrictions));

    // 4. Venues: the same cached list (and fallback) as /api/decide
    const loaded = await loadVenues();
    const candidateVenues = loaded.length > 0 ? loaded : FALLBACK_CAMPUS_VENUES;

    // 5. Diet, then budget
    // The same rule as /api/decide: a venue known to break the group's diet is out, and one nobody has checked
    // comes after every confirmed venue. Unchecked venues are only offered when fewer than 3 confirmed ones exist.
    const assessed = candidateVenues.map((v) => ({ v, diet: assessDiet(v, mergedDietaryRestrictions) })).filter((e) => e.diet.fits);
    if (assessed.length === 0) {
      return NextResponse.json(
        {
          error: `No venue meets everyone's diet requirements (${mergedDietaryRestrictions.join(", ")}). Ask someone to relax a filter, or mark more venues in the venues sheet.`,
        },
        { status: 404 }
      );
    }
    // A venue fits when its cheapest meal is within the lowest budget; one with no price can't be shown to fit.
    const affordable = assessed.flatMap((e) => {
      const price = venuePriceRange(e.v);
      return price && fitsBudget(price, strictBudgetCap) ? [{ ...e, price }] : [];
    });
    if (affordable.length === 0) {
      const cheapest = Math.min(...assessed.map((e) => venuePriceRange(e.v)?.min ?? Infinity));
      return NextResponse.json(
        {
          error: `No venue that suits everyone's diet fits the lowest budget of RM${strictBudgetCap.toFixed(2)}${
            Number.isFinite(cheapest) ? ` (the cheapest starts at RM${cheapest.toFixed(2)})` : ""
          }. Ask whoever set the lowest budget to raise it.`,
        },
        { status: 404 }
      );
    }
    const confirmed = affordable.filter((e) => e.diet.unconfirmed.length === 0);
    const unconfirmed = affordable.filter((e) => e.diet.unconfirmed.length > 0);
    const budgetVenues = confirmed.length >= 3 ? confirmed : [...confirmed, ...unconfirmed];
    const confirmedSet = new Set(confirmed.map((e) => e.v));
    const isConfirmed = (v: Venue) => confirmedSet.has(v);
    const priceByName = new Map(budgetVenues.map((e) => [e.v.name.trim().toLowerCase(), e.price]));

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
You are the Group Consensus Decision Engine for the Universiti Malaya (UM) Student Food Intelligence platform.
Multiple students with differing preferences and constraints have joined a group room to decide where to eat together.

PARTICIPANTS LIST:
${JSON.stringify(participants)}

AGGREGATED GROUP BOTTLENECK CONSTRAINTS:
- Strict Budget Cap: RM${strictBudgetCap.toFixed(2)} per person (constrained by the participant with the lowest budget)
- Strict Available Time: ${strictTimeLimit} minutes (constrained by the participant with the least time)
- Transport Bottleneck: ${transportBottleneck} ${
        hasWalkOnly
          ? "(At least ONE member has NO private vehicle. The group MUST choose a place reachable via walking or campus shuttle!)"
          : "(All members have a private vehicle; driving spots can be considered.)"
      }
- Combined Dietary Restrictions: ${
        mergedDietaryRestrictions.length > 0 ? mergedDietaryRestrictions.join(", ") : "None"
      } (Must satisfy EVERY participant's requirement, e.g. Halal, Vegetarian)

CANDIDATE VENUES (all within the budget cap and none known to break the group's diet; "dietConfirmed" false means a diet requirement was never checked for that venue):
${JSON.stringify(
  // Only what the rules below use, so the prompt stays small.
  budgetVenues.map(({ v, price }) => ({
    name: v.name,
    location: v.location,
    priceMinMYR: price.min,
    priceMaxMYR: price.max,
    isHalal: v.isHalal ?? "unknown",
    dietConfirmed: isConfirmed(v),
    serves: v.serves,
    allergyNotes: v.allergyNotes,
    menuItems: v.menuItems?.map((m) => `${m.itemName} RM${m.priceMYR}`),
  }))
)}

DECISION RULES:
1. Select 1 "winningRecommendation" that satisfies the lowest budget, strictest time, transport limitation, and all dietary restrictions.
   Prefer venues with "dietConfirmed" true; only pick one with "dietConfirmed" false when no confirmed venue fits, and say in "consensusReasoning" that its diet is unconfirmed.
   When Halal is a group requirement, never pick a venue whose "isHalal" is "unknown" while a confirmed halal venue fits.
2. Select 1 to 2 "backupOptions" as second-best alternatives, confirmed venues first.
3. "priceMinMYR"-"priceMaxMYR" is a venue's usual meal price range. A venue fits the budget when priceMinMYR is within the cap;
   prefer venues whose priceMaxMYR is within it too. "totalCostPerPersonMYR" must not exceed the cap.
4. In "consensusReasoning", write an explicit, helpful human breakdown explaining how it accommodates everyone (e.g., "Fits Student A's RM${strictBudgetCap} budget, satisfies Student B's Halal requirement, and is accessible without a car for Student C.").

Provide your response adhering strictly to the structured schema.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: Type.OBJECT,
            properties: {
              winningRecommendation: {
                type: Type.OBJECT,
                description: "The primary winning dining option for the entire group.",
                properties: {
                  venueName: { type: Type.STRING },
                  recommendedItems: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  totalCostPerPersonMYR: { type: Type.NUMBER },
                  consensusReasoning: { type: Type.STRING },
                },
                required: [
                  "venueName",
                  "recommendedItems",
                  "totalCostPerPersonMYR",
                  "consensusReasoning",
                ],
              },
              backupOptions: {
                type: Type.ARRAY,
                description: "Backup or alternative options that also meet constraints.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    venueName: { type: Type.STRING },
                    recommendedItems: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    totalCostPerPersonMYR: { type: Type.NUMBER },
                    consensusReasoning: { type: Type.STRING },
                  },
                  required: [
                    "venueName",
                    "recommendedItems",
                    "totalCostPerPersonMYR",
                    "consensusReasoning",
                  ],
                },
              },
            },
            required: ["winningRecommendation", "backupOptions"],
          },
        },
      });

      const parsed = JSON.parse(response.text ?? "{}") as GroupResolveResponse;
      // Never report a cost below the venue's cheapest meal.
      const atLeastMin = <T extends { venueName: string; totalCostPerPersonMYR: number }>(pick: T): T => {
        const price = priceByName.get(pick.venueName.trim().toLowerCase());
        return price ? { ...pick, totalCostPerPersonMYR: Math.max(pick.totalCostPerPersonMYR, price.min) } : pick;
      };
      const checked: GroupResolveResponse = {
        winningRecommendation: atLeastMin(parsed.winningRecommendation),
        backupOptions: (parsed.backupOptions ?? []).map(atLeastMin),
      };
      return NextResponse.json(withMapsUrls(checked, candidateVenues), { status: 200 });
    }

    // Heuristic Fallback Engine: the venues within the lowest budget, confirmed diet first, those fully within it
    // next, then the lowest typical (midpoint) price.
    const ranked = [...budgetVenues].sort(
      (a, b) =>
        Number(!isConfirmed(a.v)) - Number(!isConfirmed(b.v)) ||
        budgetComfort(a.price, strictBudgetCap) - budgetComfort(b.price, strictBudgetCap) ||
        midpoint(a.price) - midpoint(b.price),
    );
    // Typical cost per person: the venue's midpoint price, capped at the budget. Every ranked venue's cheapest
    // meal is within the budget, so this is never below it.
    const costFor = (price: PriceRange) => Math.min(midpoint(price), strictBudgetCap);
    const itemsFor = (v: Venue) =>
      (v.menuItems || []).filter((m) => m.priceMYR <= strictBudgetCap).map((m) => m.itemName);

    const winner = ranked[0];
    const suitableItems = itemsFor(winner.v);
    const winnerItems = suitableItems.length > 0 ? suitableItems : ["Daily Set Meal"];
    const backup = ranked[1];

    const participantNames = participants.map((p) => p.memberName).join(", ");

    const fallbackResponse: GroupResolveResponse = {
      winningRecommendation: {
        venueName: winner.v.name,
        recommendedItems: winnerItems.slice(0, 3),
        totalCostPerPersonMYR: costFor(winner.price),
        consensusReasoning: `Accommodates ${participants.length} students (${participantNames}) under lowest budget cap RM${strictBudgetCap.toFixed(
          2
        )}, matches ${transportBottleneck === "walk_or_public" ? "walking/campus shuttle limitation" : "vehicle access"}, and fulfills dietary preferences (${mergedDietaryRestrictions.join(", ") || "standard"}).${
          isConfirmed(winner.v) ? "" : " Note: this venue's diet answers are not confirmed yet."
        }`,
      },
      backupOptions: backup
        ? [
            {
              venueName: backup.v.name,
              recommendedItems: itemsFor(backup.v).slice(0, 2),
              totalCostPerPersonMYR: costFor(backup.price),
              consensusReasoning: `Strong alternative fitting within ${strictTimeLimit} mins and group budget.`,
            },
          ]
        : [],
    };

    return NextResponse.json(withMapsUrls(fallbackResponse, candidateVenues), { status: 200 });
  } catch (error) {
    console.error("Error in /api/group/resolve:", error);
    return NextResponse.json(
      {
        error: "Failed to resolve group consensus.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
