/**
 * PLANS AND PRICES: the one place to change them.
 *
 * Everything else (pricing page, upgrade dialogs, print limits, the PDF
 * server, the database) reads its numbers from here. After changing a
 * limit, run `npm run plans:sql` and paste supabase/plans.sql into
 * Supabase → SQL Editor, so the database enforces the same numbers.
 *
 * Words used here:
 * - "plan": Free, Premium or School.
 * - "feature": something a plan has or doesn't have (on/off).
 * - "limit": a number (how many variants, how many AI generations…).
 * - "entitlements": what one user may do right now (see entitlements.ts).
 *
 * Plain data, no React and no imports, so the server, the browser and the
 * tests can all use it.
 */

import { HIDDEN_FOR_TESTING as HIDDEN } from "@/lib/hiddenForTesting";

/** Shown in the small footer on Free PDFs: "Made with Rapido". */
export const BRAND = {
  name: "Rapido",
  /** The site's address for the footer, e.g. "mathtest.ge" — empty until there is a domain. */
  website: "",
};

export const PLAN_IDS = ["free", "premium", "school"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** On/off features. Limits (numbers) are in PlanLimits below. */
export const FEATURES = [
  "multipleSubjects", // more than one active teaching subject
  "noPdfFooter", // PDFs without "Made with Rapido"
  "customHeader", // school logo and own header on the paper
  "allTemplates",
  "questionBank", // personal question bank
  "docxExport", // Word (.docx)
  "sharing", // share and edit together with colleagues
  "schoolAdmin", // seats, invites, usage (School plan)
  "sharedBank", // a question bank shared by a school department
] as const;
export type Feature = (typeof FEATURES)[number];

export type PlanLimits = {
  /** Variants (A, B, C…) per test. The app supports at most 6. */
  maxVariants: number;
  /** AI question generations per calendar month (per teacher). */
  aiGenerationsPerMonth: number;
  /** Space for pictures in the cloud. */
  imageStorageMb: number;
  /** How many ready-made test templates can be used ("all" = every one). */
  templates: number | "all";
};

export type Plan = { id: PlanId; limits: PlanLimits; features: readonly Feature[] };

const PREMIUM_FEATURES: readonly Feature[] = ["multipleSubjects", "noPdfFooter", "customHeader", "allTemplates", "questionBank", "docxExport", "sharing"];

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    limits: { maxVariants: 2, aiGenerationsPerMonth: 3, imageStorageMb: 50, templates: 5 },
    features: [],
  },
  premium: {
    id: "premium",
    limits: { maxVariants: 6, aiGenerationsPerMonth: 100, imageStorageMb: 1024, templates: "all" },
    features: PREMIUM_FEATURES,
  },
  school: {
    id: "school",
    limits: { maxVariants: 6, aiGenerationsPerMonth: 100, imageStorageMb: 1024, templates: "all" },
    features: [...PREMIUM_FEATURES, "schoolAdmin", "sharedBank"],
  },
};

/**
 * Which features are already built. The pricing page marks the others
 * "coming soon", so nobody pays for something that doesn't exist yet.
 * Switch one to true when its stage is finished.
 */
// HIDDEN_FOR_TESTING: `!HIDDEN.x` switches a finished feature off for now (see lib/hiddenForTesting.ts).
export const READY: Record<Feature | "aiGenerator", boolean> = {
  multipleSubjects: true,
  noPdfFooter: !HIDDEN.premium,
  customHeader: !HIDDEN.premium,
  allTemplates: true,
  questionBank: !HIDDEN.questionBank && !HIDDEN.premium,
  docxExport: !HIDDEN.premium,
  sharing: !HIDDEN.sharing && !HIDDEN.premium,
  schoolAdmin: !HIDDEN.premium,
  sharedBank: !HIDDEN.premium,
  aiGenerator: !HIDDEN.aiGenerator,
};

// ---------------------------------------------------------------------------
// Prices (Premium, in Georgian lari)
// ---------------------------------------------------------------------------

export const BILLING_PERIODS = ["month", "year", "schoolYear"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const PREMIUM_PRICES_GEL: Record<BillingPeriod, number> = {
  month: 15,
  year: 120,
  schoolYear: 100,
};

/** How many months each period covers (for "≈ 10 ₾ a month" and the discount). */
export const PERIOD_MONTHS: Record<BillingPeriod, number> = { month: 1, year: 12, schoolYear: 10 };

/** The school year: 1 September – 30 June (months 1–12). */
export const SCHOOL_YEAR = { firstMonth: 9, lastMonth: 6 };

/**
 * Online card payment. Off until the payment provider is connected
 * (stage 2); until then "Buy" buttons explain that it opens soon.
 */
export const ONLINE_PAYMENTS = false;

/**
 * Settings → My plan offers "View the site as Free" to accounts with a
 * better plan (to compare the plans). Safe: it can only lower the plan.
 * Set to false to hide the switch.
 */
export const PLAN_PREVIEW = true;

// ---------------------------------------------------------------------------
// Trial and grace period
// ---------------------------------------------------------------------------

/** New accounts get this plan free for TRIAL_DAYS days. No card needed. */
export const TRIAL_PLAN: PlanId = "premium";
export const TRIAL_DAYS = 14;
/** After a failed renewal payment, the plan keeps working this many days. */
export const GRACE_DAYS = 7;
/**
 * A failed renewal is tried again this many days after the paid time ended.
 * The database has the same days (billing_mark_failed in supabase/schema.sql):
 * change both together.
 */
export const RENEWAL_RETRY_DAYS = [1, 3, 5] as const;
