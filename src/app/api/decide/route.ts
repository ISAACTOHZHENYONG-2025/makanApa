import { NextRequest, NextResponse } from "next/server";
import { decideMatches, type DecideRequestPayload, type DecideResponseData } from "@/lib/decide";

// The matching itself lives in src/lib/decide.ts, so the home page can run it on the server too.
export type { DecideRequestPayload, DecideResponseData, RecommendationItem, VenueMatch } from "@/lib/decide";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<DecideRequestPayload>;
    return NextResponse.json<DecideResponseData>(await decideMatches(body), { status: 200 });
  } catch (error) {
    console.error("Error in /api/decide route:", error);
    return NextResponse.json(
      {
        error: "Failed to generate food decision recommendations.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
