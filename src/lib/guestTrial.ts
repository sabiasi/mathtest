/**
 * Guest mode: ONE free trial test, then registration.
 *
 * A visitor without an account may create one test (edit, preview, print,
 * PDF). After that the "trial used" flag is set — in three places, so clearing
 * one of them doesn't reset it:
 *   - localStorage  "mathtest:guest-trial"
 *   - IndexedDB     database "mathtest-trial", store "flags", key "used"
 *   - a first-party cookie "mathtest_trial=1" (400 days, the browser maximum)
 * Whenever one place says "used", the others are written again.
 * No fingerprinting: only these flags in the visitor's own browser, plus a
 * light per-IP daily limit on the server (/api/guest-trial).
 *
 * Signed-in teachers are never limited by this. Samples don't count.
 */

export const TRIAL_STORAGE_KEY = "mathtest:guest-trial";
export const TRIAL_COOKIE = "mathtest_trial";
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // Chrome keeps cookies at most 400 days
const DB_NAME = "mathtest-trial";
const STORE = "flags";

function readCookie(): boolean {
  try {
    return document.cookie.split(";").some((part) => part.trim() === `${TRIAL_COOKIE}=1`);
  } catch {
    return false;
  }
}

function readLocal(): boolean {
  try {
    return localStorage.getItem(TRIAL_STORAGE_KEY) === "used";
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readDb(): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get("used");
      request.onsuccess = () => resolve(request.result === true);
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    } finally {
      db.close();
    }
  });
}

async function writeDb(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(true, "used");
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}

/** Quick answer from the cookie and localStorage (IndexedDB needs `isTrialUsed`). */
export function isTrialUsedSync(): boolean {
  return readCookie() || readLocal();
}

/** Remembers "trial used" in all three places. Never throws. */
export async function markTrialUsed(): Promise<void> {
  try {
    document.cookie = `${TRIAL_COOKIE}=1; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {
    // cookies blocked
  }
  try {
    localStorage.setItem(TRIAL_STORAGE_KEY, "used");
  } catch {
    // storage blocked
  }
  await writeDb();
}

/** True when any of the three places says the trial was used; then the others are restored. */
export async function isTrialUsed(): Promise<boolean> {
  const used = isTrialUsedSync() || (await readDb());
  if (used) await markTrialUsed();
  return used;
}

/**
 * May this guest start a test now? Only when the trial isn't used and they
 * have no test of their own yet (guests from before the trial existed may
 * already have some: those stay, but no new ones).
 */
export async function guestMayCreate(ownTests: number): Promise<boolean> {
  if (ownTests > 0) {
    await markTrialUsed();
    return false;
  }
  return !(await isTrialUsed());
}
