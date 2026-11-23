import { beforeEach, describe, expect, it, vi } from "vitest";
import { promoCardShownThisVisit, rememberPromoCardShown } from "./promoVideo";

describe("the promo card, once per visit", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows on a new visit", () => {
    expect(promoCardShownThisVisit()).toBe(false);
  });

  it("stays away for the rest of the visit once shown", () => {
    rememberPromoCardShown();
    expect(promoCardShownThisVisit()).toBe(true);
  });

  it("still shows (and doesn't crash) when the browser blocks storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => rememberPromoCardShown()).not.toThrow();
    expect(promoCardShownThisVisit()).toBe(false);
  });
});
