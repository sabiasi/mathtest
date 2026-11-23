import { describe, expect, it } from "vitest";
import { PROMO_SNOOZE_DAYS, promoSeenValue, shouldShowPromo } from "./promoVideo";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 10, 22, 12);

describe("shouldShowPromo", () => {
  it("shows to a first-time visitor", () => {
    expect(shouldShowPromo(null, false, now)).toBe(true);
  });

  it("shows only once per visit", () => {
    expect(shouldShowPromo(null, true, now)).toBe(false);
  });

  it("stays away for a week after it was closed or watched", () => {
    expect(shouldShowPromo(promoSeenValue(now - DAY), false, now)).toBe(false);
    expect(shouldShowPromo(promoSeenValue(now - (PROMO_SNOOZE_DAYS * DAY - 1)), false, now)).toBe(false);
    expect(shouldShowPromo(promoSeenValue(now - PROMO_SNOOZE_DAYS * DAY), false, now)).toBe(true);
  });

  it("treats broken or strange saved values as never seen", () => {
    for (const value of ["", "nonsense", "null", "{}", '{"seenAt":"yesterday"}', "[1]"]) {
      expect(shouldShowPromo(value, false, now)).toBe(true);
    }
  });

  it("is not hidden forever by a time in the future", () => {
    expect(shouldShowPromo(promoSeenValue(now + 30 * DAY), false, now)).toBe(true);
  });
});
