/**
 * The "My tests" page's logic (pure — no React): tests per subject, search,
 * grade filter, sorting and folders.
 */
import type { Test } from "@/lib/storage/types";
import { SUBJECT_IDS, type SubjectId } from "@/subjects/ids";

export const SORT_KEYS = ["updated", "created", "title"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** What the page shows: every test (grouped by subject) or one subject. */
export type HomeView = "all" | SubjectId;

export const FOLDER_LIMITS = { name: 60, perSubject: 30 };

const simplify = (text: string) => text.trim().toLocaleLowerCase().replace(/\s+/g, " ");

/** How many tests each subject has (0 for the rest). */
export function countBySubject(tests: readonly Test[]): Record<SubjectId, number> {
  const counts = Object.fromEntries(SUBJECT_IDS.map((id) => [id, 0])) as Record<SubjectId, number>;
  for (const test of tests) counts[test.subjectId] += 1;
  return counts;
}

/** The grades used by these tests ("მე-9 კლასი", "Grade 7"…), in a natural order (2 before 10). */
export function gradesOf(tests: readonly Test[]): string[] {
  const grades = new Set(tests.map((t) => t.grade.trim()).filter(Boolean));
  return [...grades].sort((a, b) => a.localeCompare(b, "ka", { numeric: true }));
}

/** Folder names for a subject: the ones tests are in, plus empty ones the teacher made. */
export function foldersOf(tests: readonly Test[], stored: readonly string[]): string[] {
  const names = new Set([...stored, ...tests.map((t) => t.folder)].map((n) => n.trim()).filter(Boolean));
  return [...names].sort((a, b) => a.localeCompare(b, "ka", { numeric: true }));
}

/** A folder name typed by the teacher, cleaned up ("" if unusable). */
export const cleanFolderName = (name: string) => name.trim().replace(/\s+/g, " ").slice(0, FOLDER_LIMITS.name);

export type TestFilter = {
  search: string;
  /** "" = every grade. */
  grade: string;
  /** null = every folder; "" = tests not in a folder; else that folder. */
  folder: string | null;
};

export function filterTests(tests: readonly Test[], filter: TestFilter): Test[] {
  const wanted = simplify(filter.search);
  return tests.filter(
    (t) =>
      (!wanted || simplify(t.title).includes(wanted)) &&
      (!filter.grade || t.grade.trim() === filter.grade) &&
      (filter.folder === null || t.folder === filter.folder),
  );
}

/** Newest first for dates; A–Z (Georgian order, then Latin) for titles; untitled last. */
export function sortTests(tests: readonly Test[], sort: SortKey): Test[] {
  const list = [...tests];
  if (sort === "title") {
    return list.sort((a, b) => {
      if (!a.title.trim() !== !b.title.trim()) return a.title.trim() ? -1 : 1;
      return a.title.localeCompare(b.title, "ka", { numeric: true, sensitivity: "base" });
    });
  }
  const key = sort === "created" ? "createdAt" : "updatedAt";
  return list.sort((a, b) => b[key].localeCompare(a[key]));
}

/** For "All tests": the subjects that have tests, in picker order, each with its tests. */
export function groupBySubject(tests: readonly Test[]): { subjectId: SubjectId; tests: Test[] }[] {
  return SUBJECT_IDS.map((subjectId) => ({ subjectId, tests: tests.filter((t) => t.subjectId === subjectId) })).filter((g) => g.tests.length > 0);
}
