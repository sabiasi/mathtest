/**
 * Guests → accounts. Someone who tried Rapido without an account has
 * tests (and pictures) saved only in this browser. When they sign up or
 * sign in, those move into their account automatically: added to the
 * account, then removed from the browser once the account has them.
 */
import type { SubjectId } from "@/subjects/ids";
import { moveDeviceImagesToAccount, removeDeviceImages } from "./images/imageStore";
import { readLocalTests, removeLocalTests } from "./storage/localTests";
import { importTests, waitUntilSaved } from "./storage/testsRepository";

/** How many guest tests this browser has. */
export function guestTestCount(): number {
  return readLocalTests().length;
}

/**
 * Call right after the account's tests were loaded. Returns how many tests
 * were added to the account (0 if there were none to move).
 */
export async function moveGuestTestsIntoAccount(allowed: readonly SubjectId[], stillCurrent: () => boolean = () => true): Promise<number> {
  const guestTests = readLocalTests().filter((test) => allowed.includes(test.subjectId));
  if (guestTests.length === 0) return 0;
  // Pictures first, so the moved tests show them straight away.
  await moveDeviceImagesToAccount(guestTests, stillCurrent);
  if (!stillCurrent()) return 0;
  const added = importTests(guestTests);
  // Only remove the browser copies once the account really has the tests.
  // (Offline? Then they stay, and the next sign-in tries again.)
  const saved = await waitUntilSaved(added.map((test) => test.id));
  if (!saved || !stillCurrent()) return 0;
  removeLocalTests(guestTests);
  await removeDeviceImages(guestTests, readLocalTests());
  return added.length;
}
