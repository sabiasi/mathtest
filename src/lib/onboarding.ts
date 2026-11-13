/**
 * Moving tests saved in this browser (before accounts existed) into the
 * teacher's account. The browser copies are never changed or deleted.
 */
import { importLocalImages } from "./images/imageStore";
import { importTests, readLocalTests } from "./storage/testsRepository";

/** Remembers, per account, that we already offered the import in this browser. */
const handledKey = (userId: string) => `mathtest:import-handled:${userId}`;

export function importWasHandled(userId: string): boolean {
  try {
    return localStorage.getItem(handledKey(userId)) !== null;
  } catch {
    return true; // storage blocked: don't keep asking
  }
}

export function markImportHandled(userId: string): void {
  try {
    localStorage.setItem(handledKey(userId), "1");
  } catch {
    // ignore
  }
}

/** How many old tests this browser has. */
export function localTestCount(): number {
  return readLocalTests().length;
}

/**
 * Uploads the old tests' pictures, then adds the tests to the account
 * (skipping any that are already there). Returns how many were added.
 */
export async function importLocalTestsIntoAccount(): Promise<number> {
  const local = readLocalTests();
  if (local.length === 0) return 0;
  await importLocalImages(local);
  return importTests(local);
}
