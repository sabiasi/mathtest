import { describe, expect, it } from "vitest";
import { allowedVariantCount, entitlementsFor, guestEntitlements, seatActive, type SchoolSeat, type Subscription } from "./entitlements";
import { schoolSeatFromJson } from "./subscription";
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

describe("school seats (the same order as public.plan_of)", () => {
  const seat = (changes: Partial<SchoolSeat> = {}): SchoolSeat => ({
    schoolId: "s1", name: "51-ე სკოლა", role: "teacher", department: "", status: "active", paidUntil: "2026-12-31T00:00:00Z", ...changes,
  });
  const at = new Date("2026-11-20T12:00:00Z");

  it("an active school gives the School plan, with every Premium feature and the school ones", () => {
    const e = entitlementsFor(null, at, seat());
    expect(e).toMatchObject({ plan: "school", state: "active", endsAt: "2026-12-31T00:00:00Z", school: { name: "51-ე სკოლა" } });
    expect(e.features).toMatchObject({ questionBank: true, sharing: true, schoolAdmin: true, sharedBank: true });
  });

  it("beats the teacher's own trial or Premium, and a school with no end date never ends", () => {
    const trial: Subscription = { plan: "premium", status: "trialing", trialEndsAt: "2026-11-25T00:00:00Z", currentPeriodEnd: null, graceEndsAt: null, cancelAtPeriodEnd: false };
    expect(entitlementsFor(trial, at, seat({ paidUntil: null })).plan).toBe("school");
  });

  it("an ended or expired school gives back the teacher's own plan, but the seat is still known", () => {
    const paid: Subscription = { plan: "premium", status: "active", trialEndsAt: null, currentPeriodEnd: "2027-01-01T00:00:00Z", graceEndsAt: null, cancelAtPeriodEnd: false };
    expect(entitlementsFor(paid, at, seat({ status: "ended" }))).toMatchObject({ plan: "premium", school: { status: "ended" } });
    expect(entitlementsFor(null, at, seat({ paidUntil: "2026-11-20T11:59:59Z" }))).toMatchObject({ plan: "free", school: { name: "51-ე სკოლა" } });
    expect(seatActive(seat({ paidUntil: "2026-11-20T12:00:00Z" }), at)).toBe(false);
    expect(seatActive(null, at)).toBe(false);
  });

  it("'View as Free' still lowers a school teacher to Free", () => {
    const preview: Subscription = { plan: "free", status: "expired", trialEndsAt: null, currentPeriodEnd: null, graceEndsAt: null, cancelAtPeriodEnd: false, previewFree: true };
    expect(entitlementsFor(preview, at, seat())).toMatchObject({ plan: "free", previewOf: { plan: "school", state: "active" } });
  });

  it("reads the database's answer safely", () => {
    expect(schoolSeatFromJson({ school_id: "s1", name: "A", role: "admin", department: "მათ.", status: "active", paid_until: null }))
      .toEqual({ schoolId: "s1", name: "A", role: "admin", department: "მათ.", status: "active", paidUntil: null });
    expect(schoolSeatFromJson({ school_id: "s1", role: "owner", status: "weird" })).toMatchObject({ role: "teacher", status: "ended" });
    for (const bad of [null, "x", {}, { school_id: 5 }]) expect(schoolSeatFromJson(bad)).toBeNull();
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
