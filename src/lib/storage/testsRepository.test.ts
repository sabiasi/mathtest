import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  STORAGE_KEY,
  createTest,
  deleteTest,
  duplicateTest,
  getSaveState,
  getTest,
  getTestsSnapshot,
  hasUnsavedChanges,
  importTests,
  listTests,
  readLocalTests,
  restoreTest,
  saveTest,
  startSync,
  stopSync,
  subscribe,
  type TestsBackend,
} from "./testsRepository";
import type { Test } from "./types";

/** A pretend cloud that keeps tests in a Map; `failNext` makes the next write fail. */
function fakeCloud(initial: Test[] = []) {
  const rows = new Map(initial.map((t) => [t.id, t]));
  const calls: string[] = [];
  let failNext = 0;
  const backend: TestsBackend = {
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
    expect(importTests([createTestShape("same"), createTestShape("new")])).toBe(1);
    await settle();
    expect([...cloud.rows.keys()].sort()).toEqual(["new", "same"]);
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

describe("readLocalTests (tests saved in the browser before accounts)", () => {
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

/** A complete test object with a fixed id. */
function createTestShape(id: string): Test {
  return {
    id,
    schoolName: "",
    title: "",
    subject: "",
    grade: "",
    date: "",
    timeLimitMinutes: null,
    instructions: "",
    labelStyle: "georgian",
    questions: [],
    printOptions: { fontSize: "normal", showPoints: true, columns: 1 },
    variants: { count: 1, shuffleQuestions: true, shuffleOptions: true, seed: 1, duplex: false },
    createdAt: "2026-11-12T09:00:00.000Z",
    updatedAt: "2026-11-12T09:00:00.000Z",
  };
}
