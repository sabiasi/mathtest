import { describe, expect, it } from "vitest";
import { allowedVariantCount, entitlementsFor, guestEntitlements, type Subscription } from "./entitlements";
import { GRACE_DAYS, PLANS } from "./plans";

const now = new Date("2026-11-13T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

const sub = (changes: Partial<Subscription>): Subscription => ({
  plan: "premium",
  status: "active",
  trialEndsAt: null,
  currentPeriodEnd: days(20),
  graceEndsAt: null,
  cancelAtPeriodEnd: false,
  ...changes,
});

describe("entitlementsFor", () => {
  it("guests and accounts without a subscription are Free", () => {
    expect(guestEntitlements()).toMatchObject({ plan: "free", state: "guest" });
    expect(entitlementsFor(null, now)).toMatchObject({ plan: "free", state: "free" });
    expect(entitlementsFor(null, now).limits).toEqual(PLANS.free.limits);
    expect(entitlementsFor(null, now).features.noPdfFooter).toBe(false);
  });

  it("a running trial is Premium, with the days left counted up", () => {
    const e = entitlementsFor(sub({ status: "trialing", plan: "free", trialEndsAt: days(13.5), currentPeriodEnd: null }), now);
    expect(e).toMatchObject({ plan: "premium", state: "trial", trialDaysLeft: 14 });
    expect(e.features.noPdfFooter).toBe(true);
    expect(entitlementsFor(sub({ status: "trialing", trialEndsAt: days(0.1) }), now).trialDaysLeft).toBe(1);
  });

  it("previewing Free lowers any better plan to Free and remembers the real one", () => {
    const trial = entitlementsFor(sub({ status: "trialing", trialEndsAt: days(5), previewFree: true }), now);
    expect(trial).toMatchObject({ plan: "free", state: "free", previewOf: { plan: "premium", state: "trial" } });
    expect(trial.features.multipleSubjects).toBe(false);
    expect(trial.limits).toEqual(PLANS.free.limits);
    expect(entitlementsFor(sub({ plan: "school", previewFree: true }), now).previewOf).toEqual({ plan: "school", state: "active" });
    // Already Free: nothing to preview.
    expect(entitlementsFor(sub({ status: "expired", previewFree: true }), now).previewOf).toBeNull();
    expect(entitlementsFor(sub({}), now).previewOf).toBeNull();
  });

  it("an ended trial is Free", () => {
    expect(entitlementsFor(sub({ status: "trialing", trialEndsAt: days(-1) }), now)).toMatchObject({ plan: "free", state: "free" });
  });

  it("a paid plan works until the renewal date", () => {
    expect(entitlementsFor(sub({}), now)).toMatchObject({ plan: "premium", state: "active", renewsAt: days(20) });
    expect(entitlementsFor(sub({ plan: "school" }), now).features.schoolAdmin).toBe(true);
  });

  it("a plan with no end date (gift, invoice) keeps working", () => {
    expect(entitlementsFor(sub({ currentPeriodEnd: null }), now)).toMatchObject({ plan: "premium", state: "active" });
  });

  it("after a missed renewal: a grace period, then Free", () => {
    const late = sub({ status: "past_due", currentPeriodEnd: days(-2) });
    expect(entitlementsFor(late, now)).toMatchObject({ plan: "premium", state: "grace" });
    const tooLate = sub({ status: "past_due", currentPeriodEnd: days(-GRACE_DAYS - 1) });
    expect(entitlementsFor(tooLate, now)).toMatchObject({ plan: "free" });
    // An explicit grace end date wins.
    expect(entitlementsFor(sub({ status: "past_due", currentPeriodEnd: days(-1), graceEndsAt: days(3) }), now).endsAt).toBe(days(3));
  });

  it("cancelled: works until the paid time is over, no grace after", () => {
    expect(entitlementsFor(sub({ status: "canceled", currentPeriodEnd: days(5) }), now)).toMatchObject({ plan: "premium", state: "ending", endsAt: days(5) });
    expect(entitlementsFor(sub({ cancelAtPeriodEnd: true, currentPeriodEnd: days(5) }), now).state).toBe("ending");
    expect(entitlementsFor(sub({ status: "canceled", currentPeriodEnd: days(-1) }), now).plan).toBe("free");
  });

  it("expired and free rows are Free", () => {
    expect(entitlementsFor(sub({ status: "expired" }), now).plan).toBe("free");
    expect(entitlementsFor(sub({ plan: "free" }), now).plan).toBe("free");
  });
});

describe("allowedVariantCount", () => {
  it("caps the variants at the plan's limit, never below 1", () => {
    const free = entitlementsFor(null, now);
    expect(allowedVariantCount(5, free)).toBe(PLANS.free.limits.maxVariants);
    expect(allowedVariantCount(1, free)).toBe(1);
    expect(allowedVariantCount(0, free)).toBe(1);
    expect(allowedVariantCount(5, entitlementsFor(sub({}), now))).toBe(5);
  });
});
