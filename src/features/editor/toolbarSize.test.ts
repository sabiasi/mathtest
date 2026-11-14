import { afterEach, describe, expect, it, vi } from "vitest";
import { COMPACT_HEIGHT, DEFAULT_SIZE, EXPANDED_HEIGHT, fitHeight, maxHeight, MIN_HEIGHT, parseSize, presetOf, readSize, writeSize } from "./toolbarSize";

describe("toolbar size", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("starts compact and open", () => {
    expect(DEFAULT_SIZE).toEqual({ height: COMPACT_HEIGHT, collapsed: false });
    expect(readSize()).toEqual(DEFAULT_SIZE);
  });

  it("leaves room for the question: the tallest panel depends on the window", () => {
    // A normal laptop window: at most 40% of it.
    expect(maxHeight(800, 170)).toBe(320);
    // A short window: what is left after the bars and 200 px for the question.
    expect(maxHeight(520, 170)).toBe(150);
    // A tiny window: never below one row of symbols.
    expect(maxHeight(300, 170)).toBe(MIN_HEIGHT);
    // A huge window: a fixed ceiling.
    expect(maxHeight(2000, 170)).toBe(420);
  });

  it("fits a chosen height between one row and the tallest allowed", () => {
    expect(fitHeight(10, 320)).toBe(MIN_HEIGHT);
    expect(fitHeight(200.4, 320)).toBe(200);
    expect(fitHeight(900, 320)).toBe(320);
    expect(fitHeight(Number.NaN, 320)).toBe(COMPACT_HEIGHT);
    // The compact default also fits a window that can't show two rows.
    expect(fitHeight(Number.NaN, MIN_HEIGHT)).toBe(MIN_HEIGHT);
  });

  it("knows the two ready-made sizes", () => {
    expect(presetOf(COMPACT_HEIGHT)).toBe("compact");
    expect(presetOf(EXPANDED_HEIGHT)).toBe("expanded");
    expect(presetOf(130)).toBeNull();
  });

  it("remembers the size, and survives broken data", () => {
    writeSize({ height: 150, collapsed: true });
    expect(readSize()).toEqual({ height: 150, collapsed: true });
    expect(parseSize(null)).toEqual(DEFAULT_SIZE);
    expect(parseSize("big")).toEqual(DEFAULT_SIZE);
    expect(parseSize({ height: "tall", collapsed: "yes" })).toEqual(DEFAULT_SIZE);
    expect(parseSize({ height: 5 })).toEqual({ height: MIN_HEIGHT, collapsed: false });
    expect(parseSize({ height: 99999, collapsed: true })).toEqual({ height: 420, collapsed: true });
    localStorage.setItem("mathtest:toolbar-size:v1", "{not json");
    expect(readSize()).toEqual(DEFAULT_SIZE);
  });

  it("works when the browser's storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readSize()).toEqual(DEFAULT_SIZE);
    expect(() => writeSize({ height: 150, collapsed: false })).not.toThrow();
  });
});
