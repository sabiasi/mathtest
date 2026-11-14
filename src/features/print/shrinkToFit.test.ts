import { describe, expect, it } from "vitest";
import { shrinkToFit } from "./usePrintLayout";

describe("shrinkToFit (a question taller than a whole page is drawn smaller)", () => {
  it("gives the share that makes the block fit, rounded down", () => {
    expect(shrinkToFit(1200, 960)).toBe(0.8);
    expect(shrinkToFit(1000, 967)).toBe(0.96);
    expect(shrinkToFit(1200, 960) * 1200).toBeLessThanOrEqual(960);
  });
  it("never goes below half size, so the text stays readable", () => {
    expect(shrinkToFit(5000, 960)).toBe(0.5);
  });
});
