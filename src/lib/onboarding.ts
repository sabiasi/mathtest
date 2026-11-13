/**
 * Small "has this browser seen …?" flags for first-time visitors.
 * (Separate from the tests themselves, which only testsRepository touches.)
 */

import { listTests } from "./storage/testsRepository";

/** Set once we gave this browser the sample test, so it's never forced back. */
export const SAMPLE_FLAG = "mathtest:sample-added";
/** Set once the teacher opened "My tests": from then on "/" skips the landing page. */
export const STARTED_FLAG = "mathtest:started";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage blocked (some privacy settings)
  }
}

/** True if the teacher has used the app before in this browser. */
export function hasStarted(): boolean {
  if (read(STARTED_FLAG)) return true;
  // People who used MathTest before this flag existed already have tests.
  try {
    return listTests().length > 0;
  } catch {
    return false;
  }
}

export function markStarted(): void {
  try {
    localStorage.setItem(STARTED_FLAG, "1");
  } catch {
    // ignore: they'll just see the landing page again next time
  }
}

/**
 * Returns true exactly once per browser: the first time the sample test
 * should be added. The flag is set first, so it can't happen twice.
 */
export function takeSampleTurn(): boolean {
  try {
    if (localStorage.getItem(SAMPLE_FLAG)) return false;
    localStorage.setItem(SAMPLE_FLAG, "1");
    return true;
  } catch {
    return false;
  }
}
