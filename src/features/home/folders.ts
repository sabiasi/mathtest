"use client";

/**
 * Folders the teacher made inside a subject on "My tests". A test keeps its
 * folder in `test.folder` (saved with the test, so it syncs); this store only
 * remembers EMPTY folders, in this browser (key `mathtest:folders:v1`).
 */
import { useSyncExternalStore } from "react";
import { cleanFolderName, FOLDER_LIMITS } from "@/lib/myTests";
import type { SubjectId } from "@/subjects/ids";

const KEY = "mathtest:folders:v1";
const EMPTY: string[] = [];
type Stored = Partial<Record<SubjectId, string[]>>;

let cache: Stored | null = null;
const listeners = new Set<() => void>();

function read(): Stored {
  if (cache) return cache;
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    cache = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Stored) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function write(subject: SubjectId, names: string[]) {
  cache = { ...read(), [subject]: names };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Private mode or full storage: the folder lives until the page is closed.
  }
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The empty folders remembered for a subject. */
export function useStoredFolders(subject: SubjectId): string[] {
  return useSyncExternalStore(subscribe, () => (Array.isArray(read()[subject]) ? read()[subject]! : EMPTY), () => EMPTY);
}

/** Adds a folder; returns its cleaned name ("" if the name was empty). */
export function addFolder(subject: SubjectId, name: string): string {
  const clean = cleanFolderName(name);
  const names = read()[subject] ?? [];
  if (clean && !names.includes(clean) && names.length < FOLDER_LIMITS.perSubject) write(subject, [...names, clean]);
  return clean;
}

export function removeFolder(subject: SubjectId, name: string) {
  write(subject, (read()[subject] ?? []).filter((n) => n !== name));
}

export function renameFolder(subject: SubjectId, from: string, to: string) {
  const names = (read()[subject] ?? []).filter((n) => n !== from && n !== to);
  write(subject, [...names, to]);
}
