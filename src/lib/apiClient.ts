import type { DecideRequestPayload, DecideResponseData } from "@/lib/decide/types";
import type { RoomInfo } from "@/app/api/group/members/route";
import type { JoinMemberPayload } from "@/app/api/group/join/route";
import type { GroupResolveResponse } from "@/app/api/group/resolve/route";
import { effectiveRestrictions } from "./diet";
import type { FilterDraft } from "./filters";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

function post<T>(url: string, body: unknown) {
  return request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const decide = (payload: DecideRequestPayload) =>
  post<DecideResponseData>("/api/decide", payload);

export const createRoom = (hostName: string) =>
  post<{ roomCode: string; roomId: string }>("/api/group/create", { hostName });

export const joinRoom = (payload: JoinMemberPayload) =>
  post<{ success: boolean }>("/api/group/join", payload);

export const resolveRoom = (roomCode: string) =>
  post<GroupResolveResponse>("/api/group/resolve", { roomCode });

export const getRoom = (roomCode: string) =>
  request<RoomInfo>(`/api/group/members?roomCode=${encodeURIComponent(roomCode)}`);

export type { RoomInfo, GroupResolveResponse };

// Dietary tags that are real restrictions; "Budget Meal" is a price preference instead.
const NON_DIETARY_TAGS = ["Budget Meal"];

export function toDecidePayload(filters: FilterDraft): DecideRequestPayload {
  return {
    craving: filters.craving.trim(),
    maxBudget: filters.tags.includes("Budget Meal") ? Math.min(filters.budget, 10) : filters.budget,
    maxDistanceKm: filters.maxDistanceKm,
    dietaryRestrictions: effectiveRestrictions(filters.tags.filter((tag) => !NON_DIETARY_TAGS.includes(tag))),
  };
}
