import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BACKUP_KEY,
  STORAGE_KEY,
  createTest,
  deleteTest,
  getTest,
  listTests,
  saveTest,
  subscribe,
} from "./testsRepository";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-12T10:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("testsRepository", () => {
  it("starts with no tests", () => {
    expect(listTests()).toEqual([]);
  });

  it("creates an empty test and can find it again", () => {
    const test = createTest();
    expect(test.title).toBe("");
    expect(test.questions).toEqual([]);
    expect(getTest(test.id)).toEqual(test);
    expect(listTests()).toHaveLength(1);
  });

  it("saving a test updates it and moves it to the top", () => {
    const first = createTest();
    vi.setSystemTime(new Date("2026-11-12T11:00:00.000Z"));
    const second = createTest();
    expect(listTests()[0].id).toBe(second.id);

    vi.setSystemTime(new Date("2026-11-12T12:00:00.000Z"));
    saveTest({ ...first, title: "ალგებრა" });

    const [top] = listTests();
    expect(top.id).toBe(first.id);
    expect(top.title).toBe("ალგებრა");
    expect(top.updatedAt).toBe("2026-11-12T12:00:00.000Z");
  });

  it("deletes a test", () => {
    const keep = createTest();
    const remove = createTest();
    deleteTest(remove.id);
    expect(listTests().map((t) => t.id)).toEqual([keep.id]);
  });

  it("returns the same list object while nothing changes", () => {
    createTest();
    expect(listTests()).toBe(listTests());
  });

  it("keeps a backup when saved data is unreadable", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, "{ this is not json");
    expect(listTests()).toEqual([]);
    expect(localStorage.getItem(BACKUP_KEY)).toBe("{ this is not json");
  });

  it("tells subscribers about changes until they unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    createTest();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    createTest();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
