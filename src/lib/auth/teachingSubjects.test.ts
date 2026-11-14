import { describe, expect, it } from "vitest";
import { activeTeachingSubjects, type TeachingSubjects } from "./teachingSubjects";
import { entitlementsFor, type Subscription } from "@/lib/plans/entitlements";

const now = new Date("2026-11-14T12:00:00Z");
const multiple: TeachingSubjects = { subjects: ["math", "physics"], completedAt: now.toISOString() };
const sub: Subscription = { plan: "premium", status: "active", trialEndsAt: null, currentPeriodEnd: null, graceEndsAt: null, cancelAtPeriodEnd: false };

describe("active teaching subjects", () => {
  it("requires explicit onboarding, even for paid accounts", () => {
    expect(activeTeachingSubjects(null, entitlementsFor(sub, now))).toEqual([]);
  });
  it("Free can use its one assigned subject", () => {
    expect(activeTeachingSubjects({ ...multiple, subjects: ["physics"] }, entitlementsFor(null, now))).toEqual(["physics"]);
  });
  it.each(["premium", "school"] as const)("%s may use multiple assigned subjects", (plan) => {
    expect(activeTeachingSubjects(multiple, entitlementsFor({ ...sub, plan }, now))).toEqual(["math", "physics"]);
  });
  it("expired trials require a choice, without modifying the stored assignments", () => {
    const trial = { ...sub, status: "trialing" as const, trialEndsAt: "2026-11-14T12:00:00Z" };
    expect(activeTeachingSubjects(multiple, entitlementsFor(trial, new Date("2026-11-14T11:59:59Z")))).toHaveLength(2);
    expect(activeTeachingSubjects(multiple, entitlementsFor(trial, now))).toEqual([]);
    expect(multiple.subjects).toHaveLength(2);
  });
  it("grace keeps multiple subjects, cancellation at the period end does not", () => {
    const late = { ...sub, status: "past_due" as const, currentPeriodEnd: "2026-11-13T12:00:00Z" };
    expect(activeTeachingSubjects(multiple, entitlementsFor(late, now))).toHaveLength(2);
    expect(activeTeachingSubjects(multiple, entitlementsFor({ ...late, cancelAtPeriodEnd: true }, now))).toEqual([]);
  });
});
