"use client";

/**
 * React "hooks" that give components the saved tests and re-render them
 * automatically whenever the tests (or their save state) change.
 */
import { useSyncExternalStore } from "react";
import { getLoadStatus, getSaveState, getStorageKind, getTestsSnapshot, subscribe, type SaveState } from "./testsRepository";
import type { Test } from "./types";

// The server never has the teacher's tests. So on the server — and until
// they're loaded from the cloud — the answer is `null`, meaning "loading".
const getServerSnapshot = () => null;

/** All tests, or `null` while loading. */
export function useTests(): Test[] | null {
  return useSyncExternalStore(subscribe, getTestsSnapshot, getServerSnapshot);
}

/** "idle" | "loading" | "ready" | "error" — e.g. to show "couldn't load, try again". */
export function useLoadStatus() {
  return useSyncExternalStore(subscribe, getLoadStatus, () => "idle" as const);
}

/** "cloud" (account) or "device" (guest, this browser only); null while unknown. */
export function useStorageKind() {
  return useSyncExternalStore(subscribe, getStorageKind, () => null);
}

/** Whether one test's latest changes have reached the cloud. */
export function useSaveState(id: string): SaveState {
  return useSyncExternalStore(
    subscribe,
    () => getSaveState(id),
    () => "saved" as const,
  );
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
