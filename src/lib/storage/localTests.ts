/**
 * Tests saved in THIS browser (localStorage), for guests: visitors who try
 * Rapido without an account. When they sign up or sign in, these tests
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

/** Where damaged data is put aside (never deleted by the app), see setAsideDamagedTests. */
export const DAMAGED_KEY = "mathtest:tests:damaged:v1";

/**
 * What the browser's storage holds:
 * - "ok": a list. `entries` is that list exactly as stored — including items
 *   this version can't read; `tests` are the readable ones. An empty library
 *   is "ok" with no entries.
 * - "blocked": the browser refuses access (private mode, a setting). Nothing
 *   can be read, and nothing can be overwritten either.
 * - "damaged": something is stored, but it isn't a list of tests (cut-off or
 *   foreign data). It must never be overwritten: it may be someone's work.
 */
export type LocalRead =
  | { state: "ok"; tests: Test[]; entries: { raw: unknown; test: Test | null }[] }
  | { state: "blocked" }
  | { state: "damaged"; raw: string };

export function readLocalState(): LocalRead {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { state: "blocked" };
  }
  if (raw === null || raw === "") return { state: "ok", tests: [], entries: [] };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { state: "damaged", raw };
  }
  if (!Array.isArray(data)) return { state: "damaged", raw };
  const entries = data.map((item: unknown) => {
    let test: Test | null = null;
    try { test = normalizeTest(item); } catch { /* one unreadable test must not hide the others */ }
    return { raw: item, test };
  });
  return { state: "ok", entries, tests: entries.map((entry) => entry.test).filter((test): test is Test => test !== null) };
}

/** The saved data can't be read, so it is left exactly as it is: nothing may be written over it. */
export class LocalTestsDamagedError extends Error {
  constructor() {
    super("The tests saved in this browser can't be read; they were left untouched");
  }
}

/** True when this browser holds saved data we can't read (see "damaged" above). */
export function localTestsDamaged(): boolean {
  return readLocalState().state === "damaged";
}

/**
 * The readable tests saved in this browser — for LOOKING only (an empty list
 * if there are none, or storage is blocked or damaged). Never write a list
 * built from this back: use the backend below, which keeps what it can't read.
 */
export function readLocalTests(): Test[] {
  const read = readLocalState();
  return read.state === "ok" ? read.tests : [];
}

/**
 * Changes the stored list. Items this version can't read are passed through
 * untouched (`keep` is only asked about readable tests). Damaged storage is
 * never written. Throws if the browser refuses (storage full or blocked);
 * the repository then retries and the editor says "not saved".
 */
function changeLocalTests(keep: (test: Test) => boolean, add?: Test): void {
  const read = readLocalState();
  if (read.state === "damaged") throw new LocalTestsDamagedError();
  const kept = read.state === "ok" ? read.entries.filter((entry) => entry.test === null || keep(entry.test)).map((entry) => entry.raw) : [];
  const next = add ? [add, ...kept] : kept;
  if (next.length === 0) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("mathtest:guest-tests"));
}

/**
 * Reads the newest list right before each change, so two open tabs don't
 * wipe out each other's tests (each change touches only its own test).
 */
export function localTestsBackend(): TestsBackend {
  return {
    kind: "device",
    list: async () => {
      const read = readLocalState();
      // Damaged: "couldn't load" (My tests explains and offers what to do), never "you have no tests".
      if (read.state === "damaged") throw new LocalTestsDamagedError();
      return read.state === "ok" ? read.tests : [];
    },
    upsert: async (test) => changeLocalTests((t) => t.id !== test.id, test),
    remove: async (id) => changeLocalTests((t) => t.id !== id),
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
    changeLocalTests((t) => movedVersion.get(t.id) !== t.updatedAt);
  } catch {
    // Storage blocked or damaged: left as it is; the tests are safe in the account anyway.
  }
}

/**
 * "Start with an empty list" after damaged data: the unreadable value is
 * first copied to another key in this browser (and read back to be sure),
 * and only then is the tests key cleared. Returns false — and changes
 * nothing — when the copy can't be made.
 */
export function setAsideDamagedTests(): boolean {
  const read = readLocalState();
  if (read.state !== "damaged") return read.state === "ok";
  try {
    // An earlier damaged copy is never overwritten: each one gets its own key.
    let key = DAMAGED_KEY;
    for (let n = 2; localStorage.getItem(key) !== null && localStorage.getItem(key) !== read.raw; n++) key = `${DAMAGED_KEY}:${n}`;
    localStorage.setItem(key, read.raw);
    if (localStorage.getItem(key) !== read.raw) return false;
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("mathtest:guest-tests"));
    return true;
  } catch {
    return false;
  }
}
