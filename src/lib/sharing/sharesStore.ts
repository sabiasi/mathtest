/**
 * Who I shared MY tests with: the `test_shares` and `test_links` tables.
 * Loaded once after sign-in and kept in memory (like the question bank).
 * The database decides who may read or write a row (Row Level Security):
 * only the owner shares, and only with a plan that has sharing.
 */
import { waitUntilSaved } from "@/lib/storage/testsRepository";
import type { ShareRole } from "@/lib/storage/testsRepository";
import { sharingMissing } from "@/lib/storage/sharedTests";
import { getSupabase } from "@/lib/supabase/client";
import { cleanEmail, shareResultOf, type Share, type ShareLink, type ShareResult } from "./sharing";

type State = { userId: string | null; email: string; status: "idle" | "loading" | "ready" | "error"; shares: Share[]; links: ShareLink[] };
let state: State = { userId: null, email: "", status: "idle", shares: [], links: [] };
const listeners = new Set<() => void>();
function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}
export function subscribeShares(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const getShares = () => state;

type ShareRow = { test_id: string; email: string; role: string; created_at: string };
const toShare = (row: ShareRow): Share => ({ testId: row.test_id, email: row.email, role: row.role === "edit" ? "edit" : "view", createdAt: row.created_at });

/** Loads the signed-in teacher's shares and links (after sign-in; again by "Try again"). */
export async function loadShares(userId: string, email: string): Promise<void> {
  if (state.userId === userId && (state.status === "loading" || state.status === "ready")) return;
  set({ userId, email: email.toLowerCase(), status: "loading", shares: [], links: [] });
  try {
    const supabase = getSupabase();
    const [shares, links] = await Promise.all([
      supabase.from("test_shares").select("test_id, email, role, created_at").eq("owner_id", userId).order("created_at").limit(5000),
      supabase.from("test_links").select("test_id, token").eq("owner_id", userId).limit(5000),
    ]);
    if (state.userId !== userId) return; // signed out (or another account) meanwhile
    for (const error of [shares.error, links.error]) if (error && !sharingMissing(error)) throw error;
    set({
      status: "ready",
      shares: ((shares.data ?? []) as ShareRow[]).map(toShare),
      links: ((links.data ?? []) as { test_id: string; token: string }[]).map((row) => ({ testId: row.test_id, token: row.token })),
    });
  } catch (error) {
    if (state.userId !== userId) return;
    console.error("Rapido: could not load the shares", error);
    set({ status: "error" });
  }
}

export function resetShares(): void {
  if (state.userId === null && state.status === "idle") return;
  set({ userId: null, email: "", status: "idle", shares: [], links: [] });
}
export function retryShares(): void {
  const { userId, email } = state;
  if (!userId) return;
  state = { ...state, status: "idle" };
  void loadShares(userId, email);
}

/** Shares a test with a colleague (or changes what they may do). */
export async function shareTest(testId: string, emailText: string, role: ShareRole): Promise<ShareResult> {
  const email = cleanEmail(emailText);
  if (!email) return "invalid";
  if (email === state.email) return "self";
  if (!state.userId) return "failed";
  try {
    // A brand-new test must be in the cloud first (the share points at it).
    await waitUntilSaved([testId]);
    const { data, error } = await getSupabase().from("test_shares")
      .upsert({ owner_id: state.userId, test_id: testId, email, role }, { onConflict: "owner_id,test_id,email" })
      .select("test_id, email, role, created_at");
    if (error) return shareResultOf(error);
    const saved = data?.[0] ? toShare(data[0] as ShareRow) : { testId, email, role, createdAt: new Date().toISOString() };
    set({ shares: [...state.shares.filter((share) => !(share.testId === testId && share.email === email)), saved] });
    return "ok";
  } catch {
    return "failed";
  }
}

export async function unshareTest(testId: string, email: string): Promise<ShareResult> {
  if (!state.userId) return "failed";
  try {
    const { error } = await getSupabase().from("test_shares").delete().eq("owner_id", state.userId).eq("test_id", testId).eq("email", email);
    if (error) return shareResultOf(error);
    set({ shares: state.shares.filter((share) => !(share.testId === testId && share.email === email)) });
    return "ok";
  } catch {
    return "failed";
  }
}

/** Makes the read-only link of a test (or returns the one it already has). */
export async function createLink(testId: string): Promise<ShareResult> {
  if (!state.userId) return "failed";
  if (state.links.some((link) => link.testId === testId)) return "ok";
  try {
    await waitUntilSaved([testId]);
    const { data, error } = await getSupabase().from("test_links").insert({ owner_id: state.userId, test_id: testId }).select("test_id, token");
    if (error) return shareResultOf(error);
    const token = (data?.[0] as { token?: unknown } | undefined)?.token;
    if (typeof token !== "string") return "failed";
    set({ links: [...state.links.filter((link) => link.testId !== testId), { testId, token }] });
    return "ok";
  } catch {
    return "failed";
  }
}

/** Switches the link off: the old address stops working at once. */
export async function removeLink(testId: string): Promise<ShareResult> {
  if (!state.userId) return "failed";
  try {
    const { error } = await getSupabase().from("test_links").delete().eq("owner_id", state.userId).eq("test_id", testId);
    if (error) return shareResultOf(error);
    set({ links: state.links.filter((link) => link.testId !== testId) });
    return "ok";
  } catch {
    return "failed";
  }
}

/** "Remove from my list": I leave a test someone shared with me. */
export async function leaveSharedTest(ownerId: string, testId: string): Promise<boolean> {
  if (!state.email) return false;
  try {
    const { error } = await getSupabase().from("test_shares").delete().eq("owner_id", ownerId).eq("test_id", testId).eq("email", state.email);
    return !error;
  } catch {
    return false;
  }
}
