"use client";

import { useState } from "react";
import { createRoom, joinRoom } from "@/lib/apiClient";
import { DIET_TAGS } from "@/lib/filters";
import MaterialIcon from "@/components/ui/MaterialIcon";

export type GroupSession = { roomCode: string; memberName: string };

type GroupEntryProps = {
  onEnter: (session: GroupSession) => void;
};

const TIME_OPTIONS = [15, 30, 45, 60];

const segmentClass = (active: boolean) =>
  `flex items-center justify-center gap-1.5 h-10 px-2 rounded-full text-xs transition-all ${
    active
      ? "font-bold bg-surface-container-lowest text-primary shadow-[0_2px_8px_rgba(30,35,41,0.04)]"
      : "font-semibold text-[#6C757D] hover:text-on-surface"
  }`;

const inputClass =
  "w-full h-12 px-3 rounded-xl bg-surface-container-lowest border border-[#DEE2E6] text-sm text-on-surface placeholder:text-[#ADB5BD] outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/15";

export default function GroupEntry({ onEnter }: GroupEntryProps) {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [budget, setBudget] = useState(15);
  const [time, setTime] = useState(30);
  const [transport, setTransport] = useState<"walk_or_public" | "private_vehicle">("walk_or_public");
  const [diet, setDiet] = useState<string[]>(["Halal"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const memberName = name.trim();
    const roomCodeInput = code.trim().toUpperCase();
    if (!memberName) return setError("Enter your name first.");
    if (tab === "join" && !roomCodeInput) return setError("Enter the room code your friend shared.");

    setBusy(true);
    setError("");
    try {
      const roomCode = tab === "create" ? (await createRoom(memberName)).roomCode : roomCodeInput;
      await joinRoom({
        roomCode,
        memberName,
        maxBudget: budget,
        availableTimeMins: time,
        transportMode: transport,
        dietaryRestrictions: diet,
      });
      onEnter({ roomCode, memberName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="bg-surface-container-lowest rounded-2xl border border-[#E9ECEF] shadow-[0_2px_8px_rgba(30,35,41,0.04)] p-4 flex flex-col gap-4">
        <div>
          <h1 className="text-[18px] font-extrabold tracking-tight">Decide together</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Everyone shares their budget, time and diet. We find one spot that works for all.
          </p>
        </div>

        <div className="grid grid-cols-2 p-1 bg-[#F1F3F5] rounded-full gap-1">
          <button className={segmentClass(tab === "create")} onClick={() => setTab("create")} type="button">
            <MaterialIcon name="add_circle" className="text-[16px]" />
            Create a room
          </button>
          <button className={segmentClass(tab === "join")} onClick={() => setTab("join")} type="button">
            <MaterialIcon name="login" className="text-[16px]" />
            Join a room
          </button>
        </div>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C757D]">Your name</span>
          <input
            className={`${inputClass} mt-1.5`}
            maxLength={24}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Arif"
            value={name}
          />
        </label>

        {tab === "join" ? (
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C757D]">Room code</span>
            <input
              className={`${inputClass} mt-1.5 font-mono uppercase tracking-widest`}
              maxLength={10}
              onChange={(event) => setCode(event.target.value)}
              placeholder="UM-ABCDE"
              value={code}
            />
          </label>
        ) : null}

        <div className="p-3.5 rounded-2xl bg-background border border-[#E9ECEF]">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold flex items-center gap-1.5" htmlFor="group-budget">
              <MaterialIcon name="payments" className="text-primary text-[17px]" />
              Your budget
            </label>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-white tabular-nums">
              RM {budget.toFixed(2)}
            </span>
          </div>
          <input
            className="w-full accent-primary h-2 cursor-pointer my-2"
            id="group-budget"
            max={30}
            min={5}
            onChange={(event) => setBudget(Number(event.target.value))}
            step={1}
            type="range"
            value={budget}
          />
        </div>

        <div>
          <p className="text-xs font-bold mb-2 flex items-center gap-1.5">
            <MaterialIcon name="schedule" className="text-tertiary-container text-[17px]" />
            Time you have
          </p>
          <div className="grid grid-cols-4 gap-2">
            {TIME_OPTIONS.map((minutes) => (
              <button
                aria-pressed={time === minutes}
                className={`h-9 rounded-full text-xs transition-all active:scale-95 tabular-nums ${
                  time === minutes
                    ? "font-bold bg-primary text-white shadow-sm"
                    : "font-semibold bg-[#F1F3F5] text-[#495057] hover:bg-[#E9ECEF]"
                }`}
                key={minutes}
                onClick={() => setTime(minutes)}
                type="button"
              >
                {minutes === 60 ? "60+ mins" : `${minutes} mins`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold mb-2 flex items-center gap-1.5">
            <MaterialIcon name="directions_walk" className="text-primary text-[17px]" />
            How you get there
          </p>
          <div className="grid grid-cols-2 p-1 bg-[#F1F3F5] rounded-full gap-1">
            <button
              className={segmentClass(transport === "walk_or_public")}
              onClick={() => setTransport("walk_or_public")}
              type="button"
            >
              🚶 Walk / Bus
            </button>
            <button
              className={segmentClass(transport === "private_vehicle")}
              onClick={() => setTransport("private_vehicle")}
              type="button"
            >
              🚗 Car / Bike
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold flex items-center gap-1.5">
              <MaterialIcon name="verified" className="text-primary text-[17px]" />
              Dietary &amp; Preference Tags
            </p>
            <span className="text-[11px] text-[#6C757D]">Multi-select</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DIET_TAGS.map(({ id, label }) => {
              const active = diet.includes(id);
              return (
                <button
                  aria-pressed={active}
                  className={`flex items-center gap-1 px-3 h-9 rounded-full text-xs transition-all active:scale-95 ${
                    active
                      ? "font-bold bg-[#E6F7ED] text-primary border-[1.5px] border-primary"
                      : "font-semibold bg-surface-container-lowest text-[#1E2329] border border-[#E9ECEF] hover:bg-[#F1F3F5]"
                  }`}
                  key={id}
                  onClick={() =>
                    setDiet((current) => (active ? current.filter((item) => item !== id) : [...current, id]))
                  }
                  type="button"
                >
                  {active ? <MaterialIcon name="check" className="text-[15px]" /> : null}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p className="rounded-xl bg-error-container text-on-error-container text-xs font-semibold px-3 py-2" role="alert">
            {error}
          </p>
        ) : null}

        <button
          className="h-12 rounded-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-primary/25 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          disabled={busy}
          onClick={submit}
          type="button"
        >
          {busy ? (
            <MaterialIcon name="progress_activity" className="text-[18px] animate-spin" />
          ) : (
            <MaterialIcon name={tab === "create" ? "group_add" : "login"} className="text-[18px]" />
          )}
          <span>{tab === "create" ? "Create room & join" : "Join room"}</span>
        </button>
      </div>
    </div>
  );
}
