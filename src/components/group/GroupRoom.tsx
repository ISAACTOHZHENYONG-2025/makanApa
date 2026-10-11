"use client";

import { useCallback, useEffect, useState } from "react";
import BottomNav from "@/components/layout/BottomNav";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { googleMapsUrl } from "@/lib/mapsLinks";
import { getRoom, resolveRoom, type GroupResolveResponse, type RoomInfo } from "@/lib/apiClient";
import GroupEntry, { type GroupSession } from "./GroupEntry";

const STORAGE_KEY = "makanapa:group-session";
const POLL_MS = 4000;
const AVATAR_TONES = [
  "bg-tertiary-fixed text-on-tertiary-fixed",
  "bg-secondary-fixed text-on-secondary-fixed",
  "bg-primary-fixed text-on-primary-fixed",
  "bg-surface-container-highest text-on-surface",
];

function readSession(): GroupSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GroupSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: GroupSession | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode); the room still works for this visit.
  }
}

type Pick = GroupResolveResponse["winningRecommendation"];

function PickCard({ pick, winner }: { pick: Pick; winner?: boolean }) {
  return (
    <div
      className={`bg-surface-container-lowest rounded-2xl p-4 relative overflow-hidden ${
        winner
          ? "border-2 border-primary/30 shadow-[0_6px_16px_rgba(30,35,41,0.08)]"
          : "border border-[#E9ECEF] shadow-[0_2px_8px_rgba(30,35,41,0.04)]"
      }`}
    >
      {winner ? (
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FFF8E1] text-[#8A6100] text-[11px] font-black uppercase mb-2">
          <MaterialIcon name="stars" className="text-[13px]" />
          <span>Group Consensus Pick</span>
        </div>
      ) : (
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#6C757D] mb-1">Backup option</p>
      )}
      <div className="flex items-start justify-between gap-2">
        <h3 className={`font-black text-on-surface leading-tight ${winner ? "text-[18px]" : "text-[15px]"}`}>
          {pick.venueName}
        </h3>
        <div className="text-right shrink-0">
          <div className="text-lg font-black text-[#007A33] leading-tight tabular-nums">
            RM {pick.totalCostPerPersonMYR.toFixed(2)}
          </div>
          <span className="text-[12px] text-on-surface-variant">per person</span>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {pick.recommendedItems.map((item) => (
          <span
            className="px-2 py-0.5 rounded-md bg-[#F1F3F5] text-[#495057] text-[11px] font-bold uppercase tracking-wide"
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
      <div className="mt-3 rounded-xl p-2.5 bg-secondary-fixed/30 border border-secondary-fixed/50 flex items-start gap-2">
        <span className="text-base shrink-0 leading-none mt-0.5">💡</span>
        <p className="text-[12px] leading-snug font-medium">{pick.consensusReasoning}</p>
      </div>
      <a
        className="mt-3 py-2.5 px-3 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-[12px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
        href={pick.mapsUrl ?? googleMapsUrl({ name: pick.venueName })}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MaterialIcon name="near_me" className="text-[16px] text-primary" />
        <span>Directions</span>
      </a>
    </div>
  );
}

export default function GroupRoom() {
  // undefined = still reading localStorage, null = no room joined
  const [session, setSession] = useState<GroupSession | null | undefined>(undefined);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [roomError, setRoomError] = useState("");
  const [result, setResult] = useState<GroupResolveResponse | null>(null);
  const [resolvedFor, setResolvedFor] = useState(0);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // localStorage only exists in the browser, so read it after mount to keep server and client markup identical.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(readSession());
  }, []);

  const leave = useCallback(() => {
    writeSession(null);
    setSession(null);
    setRoom(null);
    setResult(null);
    setResolvedFor(0);
    setRoomError("");
    setResolveError("");
  }, []);

  const roomCode = session?.roomCode;
  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;

    const load = async () => {
      try {
        const info = await getRoom(roomCode);
        if (cancelled) return;
        setRoom(info);
        setRoomError("");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not load the room.";
        if (message.includes("not found")) leave();
        else setRoomError(message);
      }
    };

    void load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [roomCode, leave]);

  const enter = (next: GroupSession) => {
    writeSession(next);
    setSession(next);
  };

  const members = room?.participants ?? [];
  const stale = result !== null && members.length !== resolvedFor;

  const resolve = async () => {
    if (!roomCode) return;
    setResolving(true);
    setResolveError("");
    try {
      setResult(await resolveRoom(roomCode));
      setResolvedFor(members.length);
    } catch (err) {
      setResult(null);
      setResolveError(err instanceof Error ? err.message : "Could not resolve the group pick.");
    } finally {
      setResolving(false);
    }
  };

  const copyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard needs a secure context; the code is still visible on screen.
    }
  };

  return (
    <div className="bg-[#f0f3f6] text-on-surface antialiased min-h-screen flex justify-center">
      <div className="w-full max-w-[420px] bg-background min-h-screen flex flex-col relative shadow-2xl">
        <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-[#E9ECEF] px-4 pt-3 pb-3 flex items-center justify-between">
          <span className="text-[22px] font-extrabold tracking-tight text-primary">
            makan<span className="text-secondary">Apa</span>
          </span>
          {session ? (
            <button
              className="h-8 px-3 rounded-full bg-surface-container hover:bg-surface-container-high text-xs font-bold flex items-center gap-1 transition-colors"
              onClick={leave}
              type="button"
            >
              <MaterialIcon name="logout" className="text-[16px]" />
              Leave
            </button>
          ) : null}
        </header>

        <main className="flex-1 px-3.5 pt-3.5 flex flex-col gap-3.5 pb-44">
          {session === undefined ? null : session === null ? (
            <GroupEntry onEnter={enter} />
          ) : (
            <>
              <section className="bg-gradient-to-r from-secondary-fixed/40 via-surface-container-lowest to-primary-fixed/20 border border-secondary-container/40 rounded-2xl p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-secondary flex items-center gap-1">
                      <MaterialIcon name="groups" className="text-[14px]" />
                      Room Active
                    </span>
                  </div>
                  <button
                    aria-label="Copy room code"
                    className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-secondary-container text-[#4A3200] font-mono flex items-center gap-1 active:scale-95 transition-transform"
                    onClick={copyCode}
                    type="button"
                  >
                    #{session.roomCode}
                    <MaterialIcon name={copied ? "check" : "content_copy"} className="text-[12px]" />
                  </button>
                </div>
                <p className="text-xs font-semibold tabular-nums">
                  {members.length} {members.length === 1 ? "friend has" : "friends have"} joined
                  <span className="text-on-surface-variant font-medium"> • share the code so others can join</span>
                </p>
              </section>

              {roomError ? (
                <p className="rounded-xl bg-error-container text-on-error-container text-xs font-semibold px-3 py-2" role="alert">
                  {roomError}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                {members.map((member, index) => {
                  const isYou = member.memberName === session.memberName;
                  return (
                    <div
                      className={`rounded-2xl p-2.5 border ${
                        isYou ? "bg-[#E6F7ED] border-primary/40" : "bg-surface-container-lowest border-[#E9ECEF]"
                      }`}
                      key={`${member.memberName}-${member.joinedAt}`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 shrink-0 rounded-full text-[11px] font-bold flex items-center justify-center ${
                            AVATAR_TONES[index % AVATAR_TONES.length]
                          }`}
                        >
                          {member.memberName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold truncate">
                          {member.memberName}
                          {isYou ? " (You)" : ""}
                        </span>
                      </div>
                      <p className="text-[12px] text-on-surface-variant mt-1.5 tabular-nums">
                        RM{member.maxBudget} • {member.availableTimeMins}m •{" "}
                        {member.transportMode === "private_vehicle" ? "Car 🚗" : "Walk 🚶"}
                      </p>
                      {member.dietaryRestrictions.length > 0 ? (
                        <p className="text-[12px] font-bold text-[#007A33] mt-0.5">
                          {member.dietaryRestrictions.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {resolveError ? (
                <p className="rounded-xl bg-error-container text-on-error-container text-xs font-semibold px-3 py-2" role="alert">
                  {resolveError}
                </p>
              ) : null}

              {result ? (
                <>
                  {stale ? (
                    <p className="text-[12px] font-semibold text-[#8A6100] bg-[#FFF8E1] rounded-xl px-3 py-2">
                      The group changed since this pick. Tap Recalculate to include everyone.
                    </p>
                  ) : null}
                  <PickCard pick={result.winningRecommendation} winner />
                  {result.backupOptions.map((option) => (
                    <PickCard key={option.venueName} pick={option} />
                  ))}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#DEE2E6] p-5 text-center text-xs text-on-surface-variant">
                  Wait for your friends to join, then tap <strong>Find Our Spot</strong>.
                </div>
              )}
            </>
          )}
        </main>

        <BottomNav
          active="group"
          actionBadge={session ? `${members.length} Members` : undefined}
          actionLabel={
            session
              ? resolving
                ? "Finding a spot..."
                : result
                  ? "Recalculate"
                  : "Find Our Spot"
              : undefined
          }
          disabled={resolving || members.length === 0}
          onAction={resolve}
          pulse={stale}
        />
      </div>
    </div>
  );
}
