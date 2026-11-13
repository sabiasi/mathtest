/**
 * Tests saved in THIS browser (localStorage), for guests: visitors who try
 * MathTest without an account. When they sign up or sign in, these tests
 * are moved into the account (see lib/onboarding.ts) and removed from here.
 *
 * It's a "backend" like the cloud one (supabaseTests.ts), so the repository
 * works exactly the same way for guests and signed-in teachers.
 *
 * The key is the same as before accounts existed, so tests from that time
 * show up as guest tests and are moved into the account the same way.
 */
import { normalizeTest } from "./migrate";
import type { TestsBackend } from "./testsRepository";
import type { Test } from "./types";

/** The "v1" lets us change the data format safely later. */
export const STORAGE_KEY = "mathtest:tests:v1";

/** The tests saved in this browser (an empty list if there are none or storage is blocked). */
export function readLocalTests(): Test[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map(normalizeTest).filter((test): test is Test => test !== null);
  } catch {
    return []; // unreadable or blocked storage
  }
}

/** Throws if the browser refuses (storage full or blocked); the repository then retries. */
function writeLocalTests(tests: Test[]): void {
  if (tests.length === 0) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
}

/**
 * Reads the newest list right before each change, so two open tabs don't
 * wipe out each other's tests (each change touches only its own test).
 */
export function localTestsBackend(): TestsBackend {
  return {
    kind: "device",
    list: async () => readLocalTests(),
    upsert: async (test) => writeLocalTests([test, ...readLocalTests().filter((t) => t.id !== test.id)]),
    remove: async (id) => writeLocalTests(readLocalTests().filter((t) => t.id !== id)),
  };
}

/**
 * After moving tests into an account: removes them from this browser. A test
 * that was changed again meanwhile (e.g. in another tab) is kept, so nothing
 * is lost; it will be moved next time.
 */
export function removeLocalTests(moved: Test[]): void {
  const movedVersion = new Map(moved.map((t) => [t.id, t.updatedAt]));
  try {
    writeLocalTests(readLocalTests().filter((t) => movedVersion.get(t.id) !== t.updatedAt));
  } catch {
    // Storage blocked: nothing we can do; the tests are safe in the account anyway.
  }
}
