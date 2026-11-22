import { describe, expect, it } from "vitest";
import { variantsPerTable } from "./AnswerTable";

describe("variantsPerTable", () => {
  it("keeps every variant in one table when the answers are short", () => {
    expect(variantsPerTable(6, 0)).toBe(6);
    expect(variantsPerTable(6, 20)).toBe(6);
  });

  it("splits into even groups when a long formula can't fit a narrow column", () => {
    // ~90 mm formula → ~50 mm at its smallest size: 3 columns of ~50 mm fit, 4 don't.
    expect(variantsPerTable(6, 90)).toBe(3);
    // 5 columns fit, but 5 + 1 is lopsided: kept even as 3 + 3.
    expect(variantsPerTable(6, 50)).toBe(3);
  });

  it("never goes below one variant per table", () => {
    expect(variantsPerTable(6, 1000)).toBe(1);
    expect(variantsPerTable(1, 1000)).toBe(1);
  });
});
