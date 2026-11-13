import { describe, expect, it } from "vitest";
import { PERIOD_MONTHS, PREMIUM_PRICES_GEL } from "./plans";
import { discountPercent, formatGel, monthlyEquivalent } from "./pricing";

describe("pricing helpers", () => {
  it("monthly costs the monthly price, with no discount", () => {
    expect(monthlyEquivalent("month")).toBe(PREMIUM_PRICES_GEL.month);
    expect(discountPercent("month")).toBe(0);
  });
  it("longer periods are divided by their months and compared with paying monthly", () => {
    for (const period of ["year", "schoolYear"] as const) {
      const perMonth = PREMIUM_PRICES_GEL[period] / PERIOD_MONTHS[period];
      expect(monthlyEquivalent(period)).toBeCloseTo(perMonth, 1);
      expect(discountPercent(period)).toBe(Math.round((1 - perMonth / PREMIUM_PRICES_GEL.month) * 100));
    }
  });
  it("formats lari without a trailing .0", () => {
    expect(formatGel(15)).toBe("15");
    expect(formatGel(12.5)).toBe("12.5");
  });
});
