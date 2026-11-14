import { describe, expect, it } from "vitest";
import { scrollNeeded } from "./keepVisible";

// A window 800 px tall whose top 200 px are covered by the editor's bar + toolbar.
const need = (top: number, bottom: number) => scrollNeeded(top, bottom, 200, 800);

describe("scrollNeeded (the page moves only when the cursor is hidden)", () => {
  it("doesn't scroll when the cursor is visible", () => {
    expect(need(300, 320)).toBe(0);
    expect(need(212, 232)).toBe(0); // right under the toolbar (12 px of air)
    expect(need(760, 788)).toBe(0); // right at the bottom
  });
  it("scrolls up just enough when the cursor is under the toolbar", () => {
    expect(need(150, 170)).toBe(-62);
    expect(need(-40, -20)).toBe(-252);
  });
  it("scrolls down just enough when the cursor is below the window", () => {
    expect(need(790, 810)).toBe(22);
  });
  it("never pushes the top of a tall thing under the toolbar", () => {
    // 300 → 900 is taller than the free space: only move until its top reaches the toolbar.
    expect(need(300, 900)).toBe(88);
  });
});
