/**
 * The tests "repository": the ONLY place in the app that reads or writes
 * saved tests. Everything else calls these functions.
 *
 * Since accounts were added, tests live in the cloud (Supabase). To keep
 * the app instant, we work like this:
 *
 * - After sign-in, all of the teacher's tests are loaded into memory once.
 * - Pages read from memory (listTests, getTest) — no waiting.
 * - Every change updates memory right away AND is put in a "send queue"
 *   that writes it to the cloud in the background. If the internet drops,
 *   the queue keeps the newest version and retries a few seconds later.
 *
 * The cloud part is a "backend" object (see supabaseTests.ts). Unit tests
 * give it a fake backend, so they run without internet.
 *
 * Old tests that were saved in this browser's localStorage (before
 * accounts) can still be read with readLocalTests(), for the import.
 */
import { newId } from "@/lib/ids";
import { duplicateQuestion } from "@/lib/questions";
import { normalizeTest, seedFromString } from "./migrate";
import { DEFAULT_PRINT_OPTIONS, DEFAULT_VARIANTS, type Test } from "./types";

/** What the repository needs from the cloud. */
export type TestsBackend = {
  list(): Promise<Test[]>;
  upsert(test: Test): Promise<void>;
  remove(id: string): Promise<void>;
};

export type SaveState = "saved" | "saving" | "error";

declare global {
  interface Window {
    /** Set by the PDF server: the test to print (so no sign-in is needed there). */
    __MATHTEST_PRINT__?: { test: unknown };
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type Status = "idle" | "loading" | "ready" | "error";

let status: Status = "idle";
let tests: Test[] = [];
let backend: TestsBackend | null = null;
/** Increases on every start/stop, so answers from an old session are ignored. */
let generation = 0;

type Write = { kind: "upsert"; test: Test } | { kind: "delete" };
/** The newest change per test id that still has to be sent. */
const queue = new Map<string, Write>();
const sending = new Set<string>();
const failed = new Set<string>();
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 2000;

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((listener) => listener());
}

const byNewest = (a: Test, b: Test) => b.updatedAt.localeCompare(a.updatedAt);

function setTests(next: Test[]) {
  tests = [...next].sort(byNewest);
  notify();
}

// The PDF server hands over the one test to print: no cloud needed.
if (typeof window !== "undefined" && window.__MATHTEST_PRINT__) {
  const injected = normalizeTest(window.__MATHTEST_PRINT__.test);
  tests = injected ? [injected] : [];
  status = "ready";
}

// ---------------------------------------------------------------------------
// Starting and stopping (called when a teacher signs in / out)
// ---------------------------------------------------------------------------

/** Loads the signed-in teacher's tests and starts sending changes to `cloud`. */
export async function startSync(cloud: TestsBackend): Promise<void> {
  if (typeof window !== "undefined" && window.__MATHTEST_PRINT__) return;
  const myGeneration = ++generation;
  backend = cloud;
  status = "loading";
  notify();
  try {
    const loaded = await cloud.list();
    if (myGeneration !== generation) return;
    // Changes made while loading (rare) win over what was loaded.
    const local = new Map(tests.map((t) => [t.id, t]));
    setTests([...loaded.filter((t) => !local.has(t.id)), ...local.values()]);
    status = "ready";
  } catch (error) {
    if (myGeneration !== generation) return;
    console.error("MathTest: could not load tests", error);
    status = "error";
  }
  notify();
  void flush();
}

/** Forgets everything in memory (sign-out). */
export function stopSync(): void {
  generation++;
  backend = null;
  status = "idle";
  tests = [];
  queue.clear();
  sending.clear();
  failed.clear();
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  notify();
}

/** Tries loading again after an error (e.g. "Try again" button). */
export function retryLoad(): void {
  if (backend) void startSync(backend);
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** All tests, most recently changed first. */
export function listTests(): Test[] {
  return tests;
}

/** All tests, or null while they are still loading (for React). */
export function getTestsSnapshot(): Test[] | null {
  return status === "ready" ? tests : null;
}

export function getLoadStatus(): Status {
  return status;
}

export function getTest(id: string): Test | undefined {
  return tests.find((test) => test.id === id);
}

// ---------------------------------------------------------------------------
// Changing (memory first, then the send queue)
// ---------------------------------------------------------------------------

function enqueue(id: string, write: Write) {
  queue.set(id, write);
  notify();
  void flush();
}

/**
 * Creates a new test, saves it, and returns it. `defaults` lets the page
 * pre-fill fields, e.g. { subject: "მათემატიკა" }.
 */
export function createTest(defaults: Partial<Omit<Test, "id">> = {}): Test {
  const now = new Date().toISOString();
  const id = newId();
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
    variants: { ...DEFAULT_VARIANTS, seed: seedFromString(id) },
    ...defaults,
    id,
    createdAt: now,
    updatedAt: now,
  };
  setTests([test, ...tests]);
  enqueue(test.id, { kind: "upsert", test });
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
  setTests([copy, ...tests]);
  enqueue(copy.id, { kind: "upsert", test: copy });
  return copy;
}

/** Saves changes to an existing test (or adds it) and returns the saved version. */
export function saveTest(test: Test): Test {
  const saved: Test = { ...test, updatedAt: new Date().toISOString() };
  setTests([saved, ...tests.filter((t) => t.id !== test.id)]);
  enqueue(saved.id, { kind: "upsert", test: saved });
  return saved;
}

export function deleteTest(id: string): void {
  setTests(tests.filter((test) => test.id !== id));
  enqueue(id, { kind: "delete" });
}

/** Puts a just-deleted test back, unchanged ("Undo"). */
export function restoreTest(test: Test): void {
  if (getTest(test.id)) return;
  setTests([...tests, test]);
  enqueue(test.id, { kind: "upsert", test });
}

/** Adds tests from elsewhere (the localStorage import), skipping ones already here. */
export function importTests(incoming: Test[]): number {
  const fresh = incoming.filter((test) => !getTest(test.id));
  if (fresh.length === 0) return 0;
  setTests([...tests, ...fresh]);
  for (const test of fresh) enqueue(test.id, { kind: "upsert", test });
  return fresh.length;
}

// ---------------------------------------------------------------------------
// The send queue
// ---------------------------------------------------------------------------

async function flush(): Promise<void> {
  if (!backend || status !== "ready") return;
  const cloud = backend;
  const myGeneration = generation;
  // Go through a snapshot ([...queue]): a failed write is put back into the
  // queue, and looping over the live Map would retry it immediately.
  for (const [id, write] of [...queue]) {
    if (queue.get(id) !== write) continue; // replaced or already sent meanwhile
    if (sending.has(id)) continue; // that test's previous write is still on its way
    queue.delete(id);
    sending.add(id);
    notify();
    try {
      if (write.kind === "upsert") await cloud.upsert(write.test);
      else await cloud.remove(id);
      if (myGeneration !== generation) return;
      failed.delete(id);
      retryDelay = 2000;
    } catch (error) {
      if (myGeneration !== generation) return;
      console.error("MathTest: could not save to the cloud", error);
      failed.add(id);
      // Put it back, unless an even newer change arrived meanwhile.
      if (!queue.has(id)) queue.set(id, write);
      scheduleRetry();
    } finally {
      if (myGeneration === generation) sending.delete(id);
    }
    notify();
    // Something new for this id arrived while sending: send that too.
    if (queue.has(id) && !failed.has(id)) void flush();
  }
}

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flush();
  }, retryDelay);
  retryDelay = Math.min(retryDelay * 2, 30_000); // 2 s, 4 s, 8 s … at most 30 s
}

/** "saved", "saving" (waiting to be sent) or "error" (sending failed, retrying). */
export function getSaveState(id: string): SaveState {
  if (failed.has(id)) return "error";
  if (queue.has(id) || sending.has(id)) return "saving";
  return "saved";
}

/** True while anything still has to reach the cloud (used to warn before closing the tab). */
export function hasUnsavedChanges(): boolean {
  return queue.size > 0 || sending.size > 0;
}

/**
 * Calls `listener` whenever the tests or their save state change.
 * Returns a function that stops listening.
 */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---------------------------------------------------------------------------
// Tests saved in this browser before accounts existed (for the import)
// ---------------------------------------------------------------------------

/** The old localStorage key. The "v1" let us change the data format safely. */
export const STORAGE_KEY = "mathtest:tests:v1";

/** The tests saved in this browser before accounts existed (they are never changed). */
export function readLocalTests(): Test[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map(normalizeTest).filter((test): test is Test => test !== null);
  } catch {
    return []; // unreadable or blocked storage: nothing to import
  }
}
