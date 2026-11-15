"use client";

/**
 * The signed-in teacher's school: their seat, invitations waiting for them,
 * and (school admins) the school's overview. Loaded from /api/school/state
 * once after sign-in, and again after every change.
 */
import { useSyncExternalStore } from "react";
import type { SchoolSeat } from "@/lib/plans/entitlements";
import { READY } from "@/lib/plans/plans";
import { apiGet, type ApiFailure } from "@/lib/schools/api";

export type SchoolInvite = { id: string; school: string; city: string; role: "admin" | "teacher"; inviter: string; created_at: string };
export type SchoolMember = { user_id: string; name: string; email: string; role: "admin" | "teacher"; department: string; joined_at: string };
export type SchoolOverview = {
  school: { id: string; name: string; city: string; seats: number; status: "active" | "ended"; paid_until: string | null; join_code: string; active: boolean };
  used: number;
  members: SchoolMember[];
  invites: { id: string; email: string; role: "admin" | "teacher"; created_at: string }[];
};
export type SchoolState = {
  userId: string | null;
  status: "idle" | "loading" | "ready" | "error";
  error: ApiFailure | null;
  seat: SchoolSeat | null;
  invites: SchoolInvite[];
  overview: SchoolOverview | null;
};

const EMPTY: SchoolState = { userId: null, status: "idle", error: null, seat: null, invites: [], overview: null };
let state = EMPTY;
const listeners = new Set<() => void>();
function set(next: Partial<SchoolState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/** Loads (or reloads) the school of `userId`. */
export async function loadSchool(userId: string): Promise<void> {
  if (!READY.schoolAdmin) return;
  if (state.userId !== userId) set({ ...EMPTY, userId, status: "loading" });
  const answer = await apiGet<{ seat: SchoolSeat | null; invites: SchoolInvite[]; overview: SchoolOverview | null }>("/api/school/state");
  if (state.userId !== userId) return; // signed out meanwhile
  if (answer.ok) set({ status: "ready", error: null, seat: answer.body.seat, invites: answer.body.invites ?? [], overview: answer.body.overview });
  // The School SQL isn't in the database yet: simply no school.
  else if (answer.error === "notReady" || answer.error === "notFound") set({ status: "ready", error: null, seat: null, invites: [], overview: null });
  else set({ status: "error", error: answer.error });
}

export function resetSchool(): void {
  if (state !== EMPTY) set(EMPTY);
}
export const reloadSchool = () => (state.userId ? loadSchool(state.userId) : Promise.resolve());

export function useSchool(): SchoolState {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}
