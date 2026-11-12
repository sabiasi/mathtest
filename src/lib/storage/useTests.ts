"use client";

/**
 * React "hooks" that give components the saved tests and re-render them
 * automatically whenever the tests change.
 */
import { useSyncExternalStore } from "react";
import { listTests, subscribe } from "./testsRepository";
import type { Test } from "./types";

// The server can't see the browser's localStorage. So on the server — and
// during the very first render in the browser — the answer is `null`,
// meaning "not loaded yet". A moment later React fills in the real data.
const getServerSnapshot = () => null;

/** All tests, or `null` while loading. */
export function useTests(): Test[] | null {
  return useSyncExternalStore(subscribe, listTests, getServerSnapshot);
}

export type TestLookup =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; test: Test };

/** One test by id, with an explicit status so pages can show the right thing. */
export function useTest(id: string): TestLookup {
  const tests = useTests();
  if (tests === null) return { status: "loading" };
  const test = tests.find((t) => t.id === id);
  return test ? { status: "ready", test } : { status: "missing" };
}
