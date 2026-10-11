import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { collection, addDoc, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { requireGroupEnabled } from "@/lib/featureFlags";

// 32^5 is about 33.5 million codes, so collisions are rare; the lookup below catches the rest.
const CODE_LENGTH = 5;
const MAX_CODE_ATTEMPTS = 5;

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    randomPart += chars.charAt(randomInt(chars.length));
  }
  return `UM-${randomPart}`;
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
    const hostName = (body.hostName || "Host").trim();

    // join, members and resolve all read the first room with a code, so a code must never be reused.
    let roomCode: string | null = null;
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !roomCode; attempt++) {
      const candidate = generateRoomCode();
      const existing = await getDocs(
        query(collection(db, "group_rooms"), where("roomCode", "==", candidate), limit(1))
      );
      if (existing.empty) roomCode = candidate;
    }
    if (!roomCode) {
      return NextResponse.json(
        { error: "Couldn't find a free room code. Please try again." },
        { status: 503 }
      );
    }

    const roomData = {
      roomCode,
      hostName,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, "group_rooms"), roomData);

    return NextResponse.json(
      {
        roomCode,
        roomId: docRef.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/group/create:", error);
    return NextResponse.json(
      {
        error: "Failed to create group room.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
