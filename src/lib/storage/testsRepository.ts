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
 * Where the tests go is a "backend" object:
 * - signed-in teachers: the cloud (supabaseTests.ts)
 * - guests (no account): this browser's localStorage (localTests.ts)
 * Unit tests give it a fake backend, so they run without internet.
 */
import { newId } from "@/lib/ids";
import { isSampleId } from "@/samples/build";
import { type SubjectId, DEFAULT_SUBJECT } from "@/subjects/ids";
import { duplicateQuestion } from "@/lib/questions";
import { normalizeTest, seedFromString } from "./migrate";
import { DEFAULT_PRINT_OPTIONS, DEFAULT_VARIANTS, type Test } from "./types";

/** What the repository needs from where tests are kept. */
export type TestsBackend = {
  /** "cloud" = the teacher's account; "device" = this browser only (guests). */
  kind: StorageKind;
  /** Present for real account backends; used to prevent cross-account client writes. */
  userId?: string;
  list(): Promise<Test[]>;
  /**
   * Saves the test. A cloud backend that counts versions refuses to save over
   * a version it hasn't seen (someone else changed the test meanwhile) by
   * throwing VersionConflictError.
   */
  upsert(test: Test): Promise<void>;
  remove(id: string): Promise<void>;
  /** The newest saved copy of one test, its version, and whether that is news to this backend. */
  fetch?(id: string): Promise<{ test: Test; version: number; changed: boolean } | null>;
  /** "I have seen this version": the next save is allowed to replace it. */
  acceptVersion?(id: string, version: number): void;
};

/** A save was refused: the cloud has a newer version (`theirs`) than the one this save was based on. */
export class VersionConflictError extends Error {
  constructor(readonly theirs: Test, readonly version: number) {
    super("The test was changed somewhere else");
  }
}

// ---- Tests that OTHER teachers shared with me (sharing, Premium) ----

export const SHARED_PREFIX = "shared~";
export const LINK_PREFIX = "link~";
export const isSharedId = (id: string) => id.startsWith(SHARED_PREFIX);
export const isLinkId = (id: string) => id.startsWith(LINK_PREFIX);
/** Inside the app a shared test's id is "shared~<owner>~<its real id>", so it can never be mixed up with my own tests. */
export const sharedKey = (ownerId: string, testId: string) => `${SHARED_PREFIX}${ownerId}~${testId}`;
export function parseSharedKey(key: string): { ownerId: string; testId: string } | null {
  if (!isSharedId(key)) return null;
  const rest = key.slice(SHARED_PREFIX.length);
  const cut = rest.indexOf("~");
  return cut > 0 && cut < rest.length - 1 ? { ownerId: rest.slice(0, cut), testId: rest.slice(cut + 1) } : null;
}

export type ShareRole = "view" | "edit";
export type SharedTest = {
  /** = test.id: "shared~<owner>~<id>". */
  key: string;
  ownerId: string;
  ownerName: string;
  role: ShareRole;
  version: number;
  test: Test;
};

export type SharedBackend = {
  list(): Promise<SharedTest[]>;
  /**
   * Saves my changes over version `shared.version` and returns the new
   * version. "gone" = no longer shared with me; "readonly" = I may only look
   * now. Throws VersionConflictError when someone else saved first.
   */
  save(shared: SharedTest, test: Test): Promise<number | "gone" | "readonly">;
  fetch(shared: SharedTest): Promise<{ test: Test; version: number } | null>;
};

export type SaveState = "saved" | "saving" | "error";
export type StorageKind = "cloud" | "device";

declare global {
  interface Window {
    /**
     * Set by the PDF server: the test to print (so no sign-in is needed there)
     * and what the teacher's plan allows (worked out on the server).
     */
    __MATHTEST_PRINT__?: { test: unknown; entitlements?: import("@/lib/plans/entitlements").Entitlements; paperHeader?: unknown };
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

let accessUser: string | null = null;
let allowedSubjects: readonly SubjectId[] = [];
export class SubjectAccessError extends Error {}

export function setSubjectWriteAccess(userId: string | null, subjects: readonly SubjectId[]) {
  accessUser = userId;
  allowedSubjects = [...subjects];
}

function assertSubjectAccess(subject: SubjectId) {
  if (backend?.kind === "cloud" && backend.userId &&
      (accessUser !== backend.userId || !allowedSubjects.includes(subject))) {
    throw new SubjectAccessError("Subject is read-only for this account");
  }
}

// Tests shared with me: kept apart from `tests`, so they never count as mine.
let sharedBackend: SharedBackend | null = null;
let shared: SharedTest[] = [];
let sharedStatus: Status = "idle";

/** Saves the cloud refused because someone else saved first: the teacher chooses (see resolveConflict). */
export type Conflict = { id: string; mine: Test; theirs: Test; version: number };
const conflicts = new Map<string, Conflict>();
let conflictList: Conflict[] = [];
function setConflict(id: string, conflict: Conflict | null) {
  if (conflict) conflicts.set(id, conflict);
  else conflicts.delete(id);
  conflictList = [...conflicts.values()];
}

/** Goes up when a test in memory is REPLACED by a newer copy from the cloud (the open editor then starts again). */
const revisions = new Map<string, number>();
const bumpRevision = (id: string) => revisions.set(id, (revisions.get(id) ?? 0) + 1);
export const getRevision = (id: string) => revisions.get(id) ?? 0;

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
// Starting and stopping (called on sign-in / sign-out, see AuthProvider)
// ---------------------------------------------------------------------------

/**
 * Loads the tests from `cloud` (the account, or this browser for guests)
 * and sends every change there from now on.
 */
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
  sharedBackend = null;
  shared = [];
  sharedStatus = "idle";
  conflicts.clear();
  conflictList = [];
  queue.clear();
  sending.clear();
  failed.clear();
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  notify();
}

/** Loads the tests other teachers shared with the signed-in teacher (after startSync; again to refresh the list). */
export async function startShared(source: SharedBackend): Promise<void> {
  const myGeneration = generation;
  sharedBackend = source;
  if (sharedStatus !== "ready") sharedStatus = "loading";
  notify();
  try {
    const loaded = await source.list();
    if (myGeneration !== generation) return;
    // A test with changes still on their way keeps the copy in memory.
    const busy = (key: string) => queue.has(key) || sending.has(key) || conflicts.has(key);
    const current = new Map(shared.map((entry) => [entry.key, entry]));
    for (const entry of loaded) {
      const old = current.get(entry.key);
      if (old && !busy(entry.key) && old.version !== entry.version) bumpRevision(entry.key);
    }
    shared = loaded.map((entry) => { const old = current.get(entry.key); return old && busy(entry.key) ? { ...old, role: entry.role } : entry; });
    sharedStatus = "ready";
  } catch (error) {
    if (myGeneration !== generation) return;
    console.error("MathTest: could not load shared tests", error);
    if (sharedStatus !== "ready") sharedStatus = "error";
  }
  notify();
}

/** Tests shared with me, or null while loading (guests: never loaded). */
export function getSharedSnapshot(): SharedTest[] | null {
  return sharedStatus === "ready" ? shared : null;
}
export const getSharedStatus = () => sharedStatus;
export const getShared = (key: string) => shared.find((entry) => entry.key === key);
/** "I left this shared test" (or the owner stopped sharing): forget it here. */
export function forgetShared(key: string): void {
  shared = shared.filter((entry) => entry.key !== key);
  queue.delete(key);
  failed.delete(key);
  setConflict(key, null);
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

/** Where tests are being saved right now (null while nobody is known yet). */
export function getStorageKind(): StorageKind | null {
  return backend?.kind ?? null;
}

export function getTest(id: string): Test | undefined {
  return tests.find((test) => test.id === id);
}

// ---------------------------------------------------------------------------
// Changing (memory first, then the send queue)
// ---------------------------------------------------------------------------

function enqueue(id: string, write: Write) {
  // While the teacher is deciding about a conflict, newer typing only updates "mine".
  const conflict = conflicts.get(id);
  if (conflict && write.kind === "upsert") {
    setConflict(id, { ...conflict, mine: write.test });
    notify();
    return;
  }
  if (conflict) setConflict(id, null); // deleted: nothing left to decide
  queue.set(id, write);
  notify();
  void flush();
}

/**
 * Creates a new test, saves it, and returns it. `defaults` lets the page
 * pre-fill fields, e.g. { subjectId: "physics", subject: "ფიზიკა" }.
 */
export function createTest(defaults: Partial<Omit<Test, "id">> = {}): Test {
  const now = new Date().toISOString();
  const id = newId();
  const test: Test = {
    schoolName: "",
    title: "",
    subjectId: DEFAULT_SUBJECT,
    subject: "",
    grade: "",
    level: "",
    date: "",
    timeLimitMinutes: null,
    instructions: "",
    labelStyle: "georgian",
    questions: [],
    printOptions: { ...DEFAULT_PRINT_OPTIONS },
    variants: { ...DEFAULT_VARIANTS, seed: seedFromString(id) },
    folder: "",
    ...defaults,
    id,
    createdAt: now,
    updatedAt: now,
  };
  assertSubjectAccess(test.subjectId);
  setTests([test, ...tests]);
  enqueue(test.id, { kind: "upsert", test });
  return test;
}

/**
 * "Use as template": saves an editable copy of a sample (or any test that
 * isn't in the list) with new ids, a fresh variant seed and today's dates.
 */
export function createTestFromTemplate(template: Test, changes: Partial<Pick<Test, "title" | "schoolName" | "folder">> = {}): Test {
  assertSubjectAccess(template.subjectId);
  const now = new Date().toISOString();
  const id = newId();
  const copy: Test = {
    ...structuredClone(template),
    ...changes,
    id,
    questions: template.questions.map((q) => duplicateQuestion(structuredClone(q))),
    variants: { ...template.variants, seed: seedFromString(id) },
    createdAt: now,
    updatedAt: now,
  };
  setTests([copy, ...tests]);
  enqueue(copy.id, { kind: "upsert", test: copy });
  return copy;
}

/** Saves a copy of a test (with a new title) and returns the copy. */
export function duplicateTest(id: string, title: string): Test | undefined {
  const original = getTest(id);
  if (!original) return undefined;
  assertSubjectAccess(original.subjectId);
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
  // Sample tests are read-only data from src/samples: never saved or uploaded.
  if (isSampleId(test.id) || isLinkId(test.id)) return test;
  if (isSharedId(test.id)) return saveSharedTest(test);
  try {
    assertSubjectAccess(test.subjectId);
    const previous = getTest(test.id);
    if (previous) assertSubjectAccess(previous.subjectId);
  } catch (error) {
    failed.add(test.id);
    notify();
    throw error;
  }
  const saved: Test = { ...test, updatedAt: new Date().toISOString() };
  setTests([saved, ...tests.filter((t) => t.id !== test.id)]);
  enqueue(saved.id, { kind: "upsert", test: saved });
  return saved;
}

/** Saves my changes to a test someone shared with me "to edit" (in a subject I teach). */
function saveSharedTest(test: Test): Test {
  const entry = getShared(test.id);
  if (!entry || entry.role !== "edit") return test;
  if (accessUser === null || !allowedSubjects.includes(test.subjectId) || !allowedSubjects.includes(entry.test.subjectId)) {
    throw new SubjectAccessError("Subject is read-only for this account");
  }
  const saved: Test = { ...test, updatedAt: new Date().toISOString() };
  shared = shared.map((item) => (item.key === test.id ? { ...item, test: saved } : item));
  notify();
  enqueue(saved.id, { kind: "upsert", test: saved });
  return saved;
}

/**
 * Puts a test into a folder ("" = no folder). Not an edit: "last edited"
 * (updatedAt) stays as it was, so the test doesn't jump to the top.
 */
export function setTestFolder(id: string, folder: string): void {
  const test = getTest(id);
  if (!test || isSampleId(id) || test.folder === folder) return;
  assertSubjectAccess(test.subjectId);
  const moved: Test = { ...test, folder };
  setTests(tests.map((t) => (t.id === id ? moved : t)));
  enqueue(id, { kind: "upsert", test: moved });
}

export function deleteTest(id: string): void {
  setTests(tests.filter((test) => test.id !== id));
  enqueue(id, { kind: "delete" });
}

/** Puts a just-deleted test back, unchanged ("Undo"). */
export function restoreTest(test: Test): void {
  if (getTest(test.id)) return;
  assertSubjectAccess(test.subjectId);
  setTests([...tests, test]);
  enqueue(test.id, { kind: "upsert", test });
}

/**
 * Adds tests from elsewhere (a guest's tests, when they sign in) and returns
 * the ones actually added. A test that's already here is skipped — unless
 * the incoming one was changed later, then it's added as a copy, so neither
 * version is lost.
 */
export function importTests(incoming: Test[]): Test[] {
  incoming.forEach((test) => assertSubjectAccess(test.subjectId));
  const added: Test[] = [];
  for (const test of incoming) {
    const existing = getTest(test.id) ?? added.find((t) => t.id === test.id);
    if (!existing) added.push(test);
    else if (test.updatedAt > existing.updatedAt) added.push({ ...test, id: newId() });
  }
  if (added.length === 0) return [];
  setTests([...tests, ...added]);
  for (const test of added) enqueue(test.id, { kind: "upsert", test });
  return added;
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
      if (isSharedId(id)) {
        if (write.kind === "upsert") await sendShared(id, write.test, myGeneration);
      } else if (write.kind === "upsert") await cloud.upsert(write.test);
      else await cloud.remove(id);
      if (myGeneration !== generation) return;
      failed.delete(id);
      retryDelay = 2000;
    } catch (error) {
      if (myGeneration !== generation) return;
      if (error instanceof VersionConflictError && write.kind === "upsert") {
        // Someone else saved first. Nothing is overwritten: the teacher chooses.
        const newer = queue.get(id);
        if (newer?.kind !== "delete") {
          queue.delete(id);
          setConflict(id, { id, mine: newer?.test ?? write.test, theirs: error.theirs, version: error.version });
        }
        failed.delete(id);
        sending.delete(id);
        notify();
        continue;
      }
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

async function sendShared(key: string, test: Test, myGeneration: number): Promise<void> {
  const entry = getShared(key);
  if (!entry || !sharedBackend) return;
  const result = await sharedBackend.save(entry, test);
  if (myGeneration !== generation) return;
  if (result === "gone") shared = shared.filter((item) => item.key !== key);
  else if (result === "readonly") shared = shared.map((item) => (item.key === key ? { ...item, role: "view" } : item));
  else shared = shared.map((item) => (item.key === key ? { ...item, version: result } : item));
}

/** The saves waiting for the teacher's choice ("someone else changed this test"). */
export function getConflicts(): Conflict[] {
  return conflictList;
}

/** "Keep mine" saves my version over theirs; "theirs" drops my unsaved changes and shows the newer test. */
export function resolveConflict(id: string, keep: "mine" | "theirs"): void {
  const conflict = conflicts.get(id);
  if (!conflict) return;
  setConflict(id, null);
  if (isSharedId(id)) shared = shared.map((item) => (item.key === id ? { ...item, version: conflict.version, test: keep === "theirs" ? conflict.theirs : item.test } : item));
  else {
    backend?.acceptVersion?.(id, conflict.version);
    if (keep === "theirs") tests = tests.map((test) => (test.id === id ? conflict.theirs : test)).sort(byNewest);
  }
  if (keep === "theirs") {
    bumpRevision(id);
    notify();
  } else enqueue(id, { kind: "upsert", test: conflict.mine });
}

/**
 * Asks the cloud for the newest copy of one test (when the editor opens, or
 * "load the new version"). Does nothing while my own changes are on their way.
 * Returns true when a newer copy was put in memory.
 */
export async function refreshTest(id: string): Promise<boolean> {
  if (status !== "ready" || isSampleId(id)) return false;
  const busy = () => queue.has(id) || sending.has(id) || conflicts.has(id);
  if (busy()) return false;
  const myGeneration = generation;
  try {
    if (isSharedId(id)) {
      const entry = getShared(id);
      if (!entry || !sharedBackend) return false;
      const latest = await sharedBackend.fetch(entry);
      if (myGeneration !== generation || busy() || getShared(id) !== entry) return false;
      if (!latest) { forgetShared(id); return false; }
      if (latest.version === entry.version) return false;
      shared = shared.map((item) => (item.key === id ? { ...item, ...latest } : item));
    } else {
      const before = getTest(id);
      if (!before || !backend?.fetch) return false;
      const latest = await backend.fetch(id);
      if (!latest || !latest.changed || myGeneration !== generation || busy() || getTest(id) !== before) return false;
      backend.acceptVersion?.(id, latest.version);
      tests = tests.map((test) => (test.id === id ? latest.test : test)).sort(byNewest);
    }
  } catch {
    return false;
  }
  bumpRevision(id);
  notify();
  return true;
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
  if (queue.has(id) || sending.has(id) || conflicts.has(id)) return "saving";
  return "saved";
}

/**
 * Resolves true once all these tests have been saved, or false if the
 * session ends first (sign-out). While offline it simply keeps waiting.
 */
export function waitUntilSaved(ids: string[]): Promise<boolean> {
  const myGeneration = generation;
  return new Promise((resolve) => {
    const check = () => {
      if (myGeneration !== generation) return finish(false);
      if (ids.every((id) => getSaveState(id) === "saved")) finish(true);
    };
    const finish = (result: boolean) => {
      stop();
      resolve(result);
    };
    const stop = subscribe(check);
    check();
  });
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
