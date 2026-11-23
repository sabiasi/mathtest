import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DAMAGED_KEY, STORAGE_KEY, localTestsBackend, localTestsDamaged, readLocalState, readLocalTests, removeLocalTests, setAsideDamagedTests } from "./localTests";
import {
  createTest,
  deleteTest,
  duplicateTest,
  getLoadStatus,
  getSaveState,
  getTest,
  getTestsSnapshot,
  hasUnsavedChanges,
  importTests,
  listTests,
  restoreTest,
  saveTest,
  startSync,
  stopSync,
  subscribe,
  waitUntilSaved,
  type TestsBackend,
} from "./testsRepository";
import type { Test } from "./types";

/** A pretend cloud that keeps tests in a Map; `failNext` makes the next write fail. */
function fakeCloud(initial: Test[] = []) {
  const rows = new Map(initial.map((t) => [t.id, t]));
  const calls: string[] = [];
  let failNext = 0;
  const backend: TestsBackend = {
    kind: "cloud",
    list: async () => [...rows.values()],
    upsert: async (test) => {
      calls.push(`upsert ${test.id} ${test.title}`);
      if (failNext > 0) {
        failNext--;
        throw new Error("offline");
      }
      rows.set(test.id, test);
    },
    remove: async (id) => {
      calls.push(`delete ${id}`);
      rows.delete(id);
    },
  };
  return { backend, rows, calls, fail: (n = 1) => (failNext = n) };
}

/** Lets pending promises (the background send queue) finish. */
const settle = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  stopSync();
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-12T10:00:00.000Z"));
});

afterEach(() => {
  stopSync();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("testsRepository (cloud)", () => {
  it("is 'loading' (null) until the cloud has answered, then has the tests", async () => {
    const existing = { ...createTestShape("a"), title: "ალგებრა" };
    const cloud = fakeCloud([existing]);
    expect(getTestsSnapshot()).toBeNull();
    const started = startSync(cloud.backend);
    expect(getTestsSnapshot()).toBeNull();
    await started;
    expect(getTestsSnapshot()?.map((t) => t.title)).toEqual(["ალგებრა"]);
  });

  it("creates a test in memory at once and sends it to the cloud", async () => {
    const cloud = fakeCloud();
    await startSync(cloud.backend);
    const test = createTest({ subject: "მათემატიკა" });
    expect(getTest(test.id)?.subject).toBe("მათემატიკა");
    expect(getSaveState(test.id)).toBe("saving");
    await settle();
    expect(cloud.rows.get(test.id)?.subject).toBe("მათემატიკა");
    expect(getSaveState(test.id)).toBe("saved");
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("saving moves a test to the top and stores the newest version", async () => {
    const cloud = fakeCloud();
    await startSync(cloud.backend);
    const first = createTest();
    vi.setSystemTime(new Date("2026-11-12T11:00:00.000Z"));
    const second = createTest();
    expect(listTests()[0].id).toBe(second.id);

    vi.setSystemTime(new Date("2026-11-12T12:00:00.000Z"));
    saveTest({ ...first, title: "ალგებრა" });
    const [top] = listTests();
    expect(top.id).toBe(first.id);
    expect(top.updatedAt).toBe("2026-11-12T12:00:00.000Z");
    await settle();
    expect(cloud.rows.get(first.id)?.title).toBe("ალგებრა");
  });

  it("only the newest of many quick saves needs to win", async () => {
    const cloud = fakeCloud();
    await startSync(cloud.backend);
    const test = createTest();
    for (const title of ["ა", "ალ", "ალგ", "ალგებრა"]) saveTest({ ...test, title });
    await settle();
    await settle();
    expect(cloud.rows.get(test.id)?.title).toBe("ალგებრა");
  });

  it("keeps a failed save and retries it a moment later", async () => {
    const cloud = fakeCloud();
    await startSync(cloud.backend);
    cloud.fail(1);
    const test = saveTest({ ...createTestShape("x"), title: "ოფლაინ" });
    await settle();
    expect(getSaveState(test.id)).toBe("error");
    expect(hasUnsavedChanges()).toBe(true);
    await vi.advanceTimersByTimeAsync(2500); // first retry after 2 s
    expect(cloud.rows.get(test.id)?.title).toBe("ოფლაინ");
    expect(getSaveState(test.id)).toBe("saved");
  });

  it("deletes, and Undo puts the test back", async () => {
    const cloud = fakeCloud();
    await startSync(cloud.backend);
    const keep = createTest();
    const remove = createTest();
    await settle();
    deleteTest(remove.id);
    expect(listTests().map((t) => t.id)).toEqual([keep.id]);
    await settle();
    expect(cloud.rows.has(remove.id)).toBe(false);
    restoreTest(remove);
    await settle();
    expect(cloud.rows.has(remove.id)).toBe(true);
  });

  it("duplicates a test with new ids for everything", async () => {
    await startSync(fakeCloud().backend);
    const original = saveTest({ ...createTestShape("o"), title: "ორიგინალი" });
    const copy = duplicateTest(original.id, "ორიგინალი (ასლი)")!;
    expect(copy.id).not.toBe(original.id);
    expect(copy.title).toBe("ორიგინალი (ასლი)");
    expect(listTests()).toHaveLength(2);
  });

  it("imports only tests that aren't there yet", async () => {
    const cloud = fakeCloud([createTestShape("same")]);
    await startSync(cloud.backend);
    expect(importTests([createTestShape("same"), createTestShape("new")])).toHaveLength(1);
    await settle();
    expect([...cloud.rows.keys()].sort()).toEqual(["new", "same"]);
  });

  it("imports a newer version of an existing test as a copy (nothing is lost)", async () => {
    const cloud = fakeCloud([{ ...createTestShape("same"), title: "ანგარიშში" }]);
    await startSync(cloud.backend);
    const newer = { ...createTestShape("same"), title: "მოწყობილობაზე", updatedAt: "2026-11-13T09:00:00.000Z" };
    const [copy] = importTests([newer]);
    expect(copy.id).not.toBe("same");
    expect(copy.title).toBe("მოწყობილობაზე");
    expect(getTest("same")?.title).toBe("ანგარიშში");
  });

  it("waitUntilSaved resolves once the tests reached the cloud, false on sign-out", async () => {
    const cloud = fakeCloud();
    await startSync(cloud.backend);
    const test = createTest();
    expect(await waitUntilSaved([test.id])).toBe(true);
    expect(cloud.rows.has(test.id)).toBe(true);

    cloud.fail(1);
    const pending = waitUntilSaved([createTest().id]);
    stopSync();
    expect(await pending).toBe(false);
  });

  it("forgets everything on sign-out", async () => {
    await startSync(fakeCloud().backend);
    createTest();
    stopSync();
    expect(getTestsSnapshot()).toBeNull();
    expect(listTests()).toEqual([]);
  });

  it("tells subscribers about changes", async () => {
    await startSync(fakeCloud().backend);
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    createTest();
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
});

describe("guest tests in this browser (localStorage)", () => {
  it("the device backend saves, changes and deletes tests", async () => {
    await startSync(localTestsBackend());
    const test = createTest({ title: "სტუმარი" });
    await settle();
    expect(readLocalTests().map((t) => t.title)).toEqual(["სტუმარი"]);
    saveTest({ ...test, title: "შეცვლილი" });
    await settle();
    expect(readLocalTests()[0].title).toBe("შეცვლილი");
    deleteTest(test.id);
    await settle();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("removeLocalTests keeps a test that was changed after it was moved", () => {
    const a = createTestShape("a");
    const b = createTestShape("b");
    localStorage.setItem(STORAGE_KEY, JSON.stringify([a, { ...b, updatedAt: "2026-11-13T10:00:00.000Z" }]));
    removeLocalTests([a, b]);
    expect(readLocalTests().map((t) => t.id)).toEqual(["b"]);
  });

  it("reads and upgrades them", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: "old", title: "ძველი", questions: [] }]));
    const [test] = readLocalTests();
    expect(test.title).toBe("ძველი");
    expect(test.printOptions).toBeDefined();
  });

  it("returns nothing for missing or broken data", () => {
    expect(readLocalTests()).toEqual([]);
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(readLocalTests()).toEqual([]);
  });
});

describe("guest storage that can't be read is never overwritten", () => {
  const BROKEN = '[{"id":"a","title":"ნახევრად შენახ';
  const errors = () => vi.spyOn(console, "error").mockImplementation(() => {});

  it("missing storage is a genuinely empty library", async () => {
    expect(readLocalState()).toEqual({ state: "ok", tests: [], entries: [] });
    await startSync(localTestsBackend());
    expect(getLoadStatus()).toBe("ready");
    expect(getTestsSnapshot()).toEqual([]);
  });

  it("malformed data: loading fails (not 'no tests'), and saving a new test leaves it untouched", async () => {
    errors();
    localStorage.setItem(STORAGE_KEY, BROKEN);
    await startSync(localTestsBackend());
    expect(getLoadStatus()).toBe("error");
    expect(getTestsSnapshot()).toBeNull();
    expect(localTestsDamaged()).toBe(true);

    // Even a write straight to the backend is refused.
    await expect(localTestsBackend().upsert(createTestShape("new"))).rejects.toThrow();
    await expect(localTestsBackend().remove("a")).rejects.toThrow();
    removeLocalTests([createTestShape("a")]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(BROKEN);
  });

  it("data that is not a list (an object) is damaged too", async () => {
    localStorage.setItem(STORAGE_KEY, '{"id":"a"}');
    expect(readLocalState().state).toBe("damaged");
    await expect(localTestsBackend().upsert(createTestShape("new"))).rejects.toThrow();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"id":"a"}');
  });

  it("'start with an empty list' keeps the damaged data under another key first", async () => {
    errors();
    localStorage.setItem(STORAGE_KEY, BROKEN);
    expect(setAsideDamagedTests()).toBe(true);
    expect(localStorage.getItem(DAMAGED_KEY)).toBe(BROKEN);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    await startSync(localTestsBackend());
    expect(getLoadStatus()).toBe("ready");

    // A second damaged value never replaces the first one that was put aside.
    localStorage.setItem(STORAGE_KEY, "{again");
    expect(setAsideDamagedTests()).toBe(true);
    expect(localStorage.getItem(DAMAGED_KEY)).toBe(BROKEN);
    expect(localStorage.getItem(`${DAMAGED_KEY}:2`)).toBe("{again");
  });

  it("when the copy can't be made (storage full), nothing is changed", () => {
    localStorage.setItem(STORAGE_KEY, BROKEN);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    expect(setAsideDamagedTests()).toBe(false);
    vi.restoreAllMocks();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(BROKEN);
  });

  it("entries this version can't read stay in storage through saves, deletes and the move into an account", async () => {
    const good = { ...createTestShape("good"), title: "კარგი" };
    const strange = { title: "id-ის გარეშე", questions: [1, 2, 3] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([strange, good, "ტექსტი"]));
    const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!) as unknown[];

    await startSync(localTestsBackend());
    expect(getTestsSnapshot()?.map((t) => t.id)).toEqual(["good"]);
    saveTest({ ...good, title: "შეცვლილი" });
    const added = createTest({ title: "ახალი" });
    await settle();
    expect(stored()).toHaveLength(4);
    expect(stored()).toContainEqual(strange);
    expect(stored()).toContain("ტექსტი");
    expect(readLocalTests().map((t) => t.title).sort()).toEqual(["ახალი", "შეცვლილი"]);

    deleteTest(added.id);
    await settle();
    removeLocalTests(readLocalTests());
    expect(stored()).toEqual([strange, "ტექსტი"]);
  });

  it("blocked storage: nothing to read, and a save is reported as failed", async () => {
    errors();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    expect(readLocalState()).toEqual({ state: "blocked" });
    await startSync(localTestsBackend());
    expect(getLoadStatus()).toBe("ready"); // a visitor can still try the editor
    const test = createTest();
    await settle();
    expect(getSaveState(test.id)).toBe("error");
    expect(hasUnsavedChanges()).toBe(true);
  });

  it("a full storage: the save fails, the old copy stays, and it is saved once there is room", async () => {
    errors();
    await startSync(localTestsBackend());
    const test = createTest({ title: "ძველი" });
    await settle();
    const full = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    saveTest({ ...test, title: "ახალი" });
    await settle();
    expect(getSaveState(test.id)).toBe("error");
    expect(readLocalTests()[0].title).toBe("ძველი");
    full.mockRestore();
    await vi.advanceTimersByTimeAsync(2000); // the retry
    expect(getSaveState(test.id)).toBe("saved");
    expect(readLocalTests()[0].title).toBe("ახალი");
  });
});

/** A complete test object with a fixed id. */
function createTestShape(id: string): Test {
  return {
    id,
    schoolName: "",
    title: "",
    subjectId: "math",
    subject: "",
    grade: "",
    level: "",
    date: "",
    timeLimitMinutes: null,
    instructions: [],
    labelStyle: "georgian",
    questions: [],
    printOptions: { fontSize: "normal", showPoints: true, columns: 1 },
    variants: { count: 1, shuffleQuestions: true, shuffleOptions: true, seed: 1, duplex: false },
    folder: "",
    createdAt: "2026-11-12T09:00:00.000Z",
    updatedAt: "2026-11-12T09:00:00.000Z",
  };
}
