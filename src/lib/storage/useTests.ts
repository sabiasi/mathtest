"use client";

/**
 * React "hooks" that give components the saved tests and re-render them
 * automatically whenever the tests (or their save state) change.
 */
import { useMemo, useSyncExternalStore } from "react";
import { getLoadStatus, getSaveState, getStorageKind, getTestsSnapshot, subscribe, type SaveState } from "./testsRepository";
import { readLocalTests, STORAGE_KEY } from "./localTests";
import { DEVICE_TEST_PREFIX, isDeviceTestId } from "@/lib/auth/teachingSubjects";
import type { Test } from "./types";
import { getSample, isSampleId } from "@/samples";

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

const noSubscription = () => () => {};

function subscribeDevice(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("mathtest:guest-tests", listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("mathtest:guest-tests", listener); };
}
function deviceSnapshot() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
export function useRetainedGuestTests(): Test[] {
  const raw = useSyncExternalStore(subscribeDevice, deviceSnapshot, getServerSnapshot);
  return useMemo(() => raw ? readLocalTests() : [], [raw]);
}

/** One test by id, with an explicit status so pages can show the right thing. */
export function useTest(id: string): TestLookup {
  const tests = useTests();
  const device = useRetainedGuestTests();
  // Sample tests come from src/samples (no loading, no account). Only after
  // hydration: the server renders "loading" like for every other test.
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  if (isDeviceTestId(id)) {
    const original = device.find((t) => t.id === id.slice(DEVICE_TEST_PREFIX.length));
    const test = tests?.find((t) => t.id === id) ?? (original ? { ...original, id } : undefined);
    return !hydrated ? { status: "loading" } : test ? { status: "ready", test } : { status: "missing" };
  }
  if (isSampleId(id)) {
    // The PDF server injects the sample WITH the options chosen on the print page: prefer that copy.
    const sample = hydrated ? (tests?.find((t) => t.id === id) ?? getSample(id)) : null;
    return !hydrated ? { status: "loading" } : sample ? { status: "ready", test: sample } : { status: "missing" };
  }
  if (tests === null) return { status: "loading" };
  const test = tests.find((t) => t.id === id);
  return test ? { status: "ready", test } : { status: "missing" };
}
