/**
 * Sharing: small pure helpers (no cloud, no React), so they can be unit-tested.
 *
 * Words used: a "share" = one colleague (by email) who may "view" or "edit"
 * one test. A "link" = a long secret address that shows one test read-only.
 */
import type { ShareRole } from "@/lib/storage/testsRepository";

export type Share = { testId: string; email: string; role: ShareRole; createdAt: string };
export type ShareLink = { testId: string; token: string };
/** At most this many people per test (the database has the same number). */
export const MAX_SHARES_PER_TEST = 30;

/** A tidy email address (lower case), or null when it can't be one. */
export function cleanEmail(text: string): string | null {
  const email = text.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** The address a read-only link opens. */
export const linkPath = (token: string) => `/shared/${token}`;

/** What can go wrong when sharing; each has a Georgian + English message (`share.error.<kind>`). */
export type ShareResult = "ok" | "invalid" | "self" | "premium" | "full" | "notSaved" | "failed";

export function shareResultOf(error: { code?: string } | null): ShareResult {
  if (!error) return "ok";
  if (error.code === "42501") return "premium"; // refused by the plan rule
  if (error.code === "54000") return "full";
  if (error.code === "23503") return "notSaved"; // the test hasn't reached the cloud yet
  return "failed";
}

export type Person = { id: string; name: string };

/**
 * Who else has this test open, from Supabase Realtime's "presence" list
 * (key → that person's open tabs). Me and repeated tabs are left out.
 */
export function othersPresent(state: Record<string, { name?: unknown }[]>, myId: string): Person[] {
  const people: Person[] = [];
  for (const [id, tabs] of Object.entries(state)) {
    if (id === myId || tabs.length === 0) continue;
    const name = tabs.find((tab) => typeof tab.name === "string" && tab.name.trim())?.name;
    people.push({ id, name: typeof name === "string" ? name.trim().slice(0, 60) : "" });
  }
  return people.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

/** Two letters for the little round badge: "ნინო ბერიძე" → "ნბ". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? [...words[0]].slice(0, 2) : [[...words[0]][0], [...words[words.length - 1]][0]];
  // Only Latin letters are capitalised: toUpperCase() would turn Georgian letters into Mtavruli (ᲜᲑ).
  return letters.map((letter) => (/[a-z]/.test(letter) ? letter.toUpperCase() : letter)).join("");
}
