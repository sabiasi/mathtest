/**
 * The tests "repository": the ONLY place in the app that reads or writes
 * saved tests. Everything else calls these functions.
 *
 * Today the data lives in the browser's localStorage. When we add accounts
 * and a real database later, we only have to change this file — the pages
 * won't notice.
 */
import { newId } from "@/lib/ids";
import { duplicateQuestion } from "@/lib/questions";
import { normalizeTest } from "./migrate";
import { DEFAULT_PRINT_OPTIONS, type Test } from "./types";

/** The localStorage key. The "v1" lets us change the data format later safely. */
export const STORAGE_KEY = "mathtest:tests:v1";
/** If saved data is ever unreadable, a copy is kept here so nothing is lost for good. */
export const BACKUP_KEY = `${STORAGE_KEY}:unreadable-backup`;

type Listener = () => void;
const listeners = new Set<Listener>();

// React asks "what is the data now?" very often. To answer quickly — and to
// return the *same* array when nothing changed — we remember the last result.
let cachedRaw: string | null | undefined; // undefined = never read yet
let cachedTests: Test[] = [];

function parse(raw: string | null): Test[] {
  if (raw === null) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error("Saved tests are not a list");
    // Upgrade tests saved by older versions to the current shape.
    return data.map(normalizeTest).filter((test): test is Test => test !== null);
  } catch (error) {
    console.error("MathTest: could not read saved tests", error);
    if (localStorage.getItem(BACKUP_KEY) === null) {
      localStorage.setItem(BACKUP_KEY, raw);
    }
    return [];
  }
}

function writeAll(tests: Test[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
  listeners.forEach((listener) => listener());
}

/** All saved tests, most recently changed first. */
export function listTests(): Test[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedTests = parse(raw).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return cachedTests;
}

export function getTest(id: string): Test | undefined {
  return listTests().find((test) => test.id === id);
}

/**
 * Creates a new test, saves it, and returns it. `defaults` lets the page
 * pre-fill fields, e.g. { subject: "მათემატიკა" }.
 */
export function createTest(defaults: Partial<Omit<Test, "id">> = {}): Test {
  const now = new Date().toISOString();
  const test: Test = {
    schoolName: "",
    title: "",
    subject: "",
    grade: "",
    date: "",
    timeLimitMinutes: null,
    instructions: "",
    labelStyle: "georgian",
    questions: [],
    printOptions: { ...DEFAULT_PRINT_OPTIONS },
    ...defaults,
    id: newId(),
    createdAt: now,
    updatedAt: now,
  };
  writeAll([test, ...listTests()]);
  return test;
}

/** Saves a copy of a test (with a new title) and returns the copy. */
export function duplicateTest(id: string, title: string): Test | undefined {
  const original = getTest(id);
  if (!original) return undefined;
  const now = new Date().toISOString();
  const copy: Test = {
    ...original,
    id: newId(),
    title,
    questions: original.questions.map(duplicateQuestion),
    createdAt: now,
    updatedAt: now,
  };
  writeAll([copy, ...listTests()]);
  return copy;
}

/** Saves changes to an existing test (or adds it) and returns the saved version. */
export function saveTest(test: Test): Test {
  const saved: Test = { ...test, updatedAt: new Date().toISOString() };
  const others = listTests().filter((t) => t.id !== test.id);
  writeAll([saved, ...others]);
  return saved;
}

export function deleteTest(id: string): void {
  writeAll(listTests().filter((test) => test.id !== id));
}

/**
 * Calls `listener` whenever the saved tests change — in this tab, or in
 * another tab of the same browser (that's what the "storage" event is for).
 * Returns a function that stops listening.
 */
export function subscribe(listener: Listener): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
