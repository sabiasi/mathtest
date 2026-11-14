import { beforeEach, describe, expect, it } from "vitest";
import { guestMayCreate, isTrialUsed, isTrialUsedSync, markTrialUsed, TRIAL_COOKIE, TRIAL_STORAGE_KEY } from "./guestTrial";

const clearCookie = () => (document.cookie = `${TRIAL_COOKIE}=; Max-Age=0; Path=/`);

describe("guest trial flag", () => {
  beforeEach(() => {
    localStorage.clear();
    clearCookie();
  });

  it("a fresh browser may start one trial", async () => {
    expect(isTrialUsedSync()).toBe(false);
    expect(await guestMayCreate(0)).toBe(true);
  });

  it("once used, it is remembered in the cookie and localStorage", async () => {
    await markTrialUsed();
    expect(document.cookie).toContain(`${TRIAL_COOKIE}=1`);
    expect(localStorage.getItem(TRIAL_STORAGE_KEY)).toBe("used");
    expect(await guestMayCreate(0)).toBe(false);
  });

  it("clearing one place is not enough: the others restore it", async () => {
    await markTrialUsed();
    localStorage.clear();
    expect(await isTrialUsed()).toBe(true);
    expect(localStorage.getItem(TRIAL_STORAGE_KEY)).toBe("used");
    clearCookie();
    expect(await isTrialUsed()).toBe(true);
    expect(document.cookie).toContain(`${TRIAL_COOKIE}=1`);
  });

  it("a guest who already has a test (from before the trial existed) can't start another", async () => {
    expect(await guestMayCreate(1)).toBe(false);
    expect(isTrialUsedSync()).toBe(true);
  });
});
