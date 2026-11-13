"use client";

/**
 * /pricing — the three plans, a comparison table, questions and answers,
 * and the School plan request form. All numbers come from lib/plans/plans.ts.
 *
 * Friendly, never pushy: Free is shown as a real option, features that
 * aren't built yet say "Soon", and nothing here interrupts anyone's work.
 */
import { Check, ChevronDown, Crown, Minus, School, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PageTransition } from "@/components/PageTransition";
import { buttonVariants } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/form";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePlan } from "@/features/plans/PlanProvider";
import { useT } from "@/i18n/language";
import { formatSize } from "@/lib/format";
import {
  BILLING_PERIODS,
  BRAND,
  ONLINE_PAYMENTS,
  PLANS,
  PREMIUM_PRICES_GEL,
  READY,
  TRIAL_DAYS,
  type BillingPeriod,
  type Feature,
  type PlanId,
} from "@/lib/plans/plans";
import { discountPercent, formatGel, monthlyEquivalent } from "@/lib/plans/pricing";
import { cn } from "@/lib/utils";
import { VARIANT_LABELS } from "@/lib/variants";
import { SchoolRequestForm } from "./SchoolRequestForm";

const MB = 1024 * 1024;
const megabytes = (mb: number) => formatSize(mb * MB);
const variantLabels = (count: number) =>
  count <= 2 ? VARIANT_LABELS.slice(0, count).join(", ") : `${VARIANT_LABELS[0]}–${VARIANT_LABELS[count - 1]}`;

type Bullet = { text: string; soon?: boolean };

export function PricingView() {
  const t = useT();
  const { status } = useAuth();
  const { entitlements, ready } = usePlan();
  const [period, setPeriod] = useState<BillingPeriod>("year");
  const signedIn = status === "signed-in";
  const accounts = status !== "unconfigured";
  const current: PlanId | null = signedIn && ready ? entitlements.plan : null;
  const free = PLANS.free.limits;
  const premium = PLANS.premium.limits;

  // ---- What each card lists ----
  const freeBullets: Bullet[] = [
    { text: t("pricing.f.subjects") },
    { text: t("pricing.f.unlimitedTests") },
    { text: t("pricing.f.printPdf") },
    { text: t("pricing.f.variants", { count: free.maxVariants, labels: variantLabels(free.maxVariants) }) },
    { text: t("pricing.f.ai", { count: free.aiGenerationsPerMonth }), soon: !READY.aiGenerator },
    { text: t("pricing.f.images", { size: megabytes(free.imageStorageMb) }) },
    { text: t("pricing.f.templates", { count: String(free.templates) }), soon: !READY.allTemplates },
    { text: t("pricing.f.footer", { name: BRAND.name }) },
  ];
  const premiumBullets: Bullet[] = [
    { text: t("pricing.f.everythingFree") },
    { text: t("pricing.f.variantsAll", { labels: variantLabels(premium.maxVariants) }) },
    { text: t("pricing.f.noFooter"), soon: !READY.noPdfFooter },
    { text: t("pricing.f.ai", { count: premium.aiGenerationsPerMonth }), soon: !READY.aiGenerator },
    { text: t("pricing.f.images", { size: megabytes(premium.imageStorageMb) }) },
    { text: t("pricing.f.templatesAll"), soon: !READY.allTemplates },
    { text: t("pricing.f.customHeader"), soon: !READY.customHeader },
    { text: t("pricing.f.questionBank"), soon: !READY.questionBank },
    { text: t("pricing.f.docx"), soon: !READY.docxExport },
    { text: t("pricing.f.sharing"), soon: !READY.sharing },
  ];
  const schoolBullets: Bullet[] = [
    { text: t("pricing.f.everythingPremium") },
    { text: t("pricing.f.schoolAdmin"), soon: !READY.schoolAdmin },
    { text: t("pricing.f.sharedBank"), soon: !READY.sharedBank },
    { text: t("pricing.f.invoice") },
  ];

  // ---- Buttons (they depend on who is looking) ----
  const ctaClass = "h-auto min-h-11 w-full py-2.5 whitespace-normal text-center";
  const currentLabel = (
    <span className={cn(buttonVariants({ variant: "secondary" }), ctaClass, "pointer-events-none")} aria-disabled="true">
      <Check aria-hidden="true" />
      {t("pricing.cta.current")}
    </span>
  );

  let freeCta: ReactNode = null;
  if (!signedIn) {
    freeCta = (
      <Link href={accounts ? "/signup" : "/tests"} className={cn(buttonVariants({ variant: "outline" }), ctaClass)}>
        {t("pricing.cta.startFree")}
      </Link>
    );
  } else if (current === "free") freeCta = currentLabel;

  let premiumCta: ReactNode;
  if (!signedIn) {
    premiumCta = (
      <Link href={accounts ? "/signup" : "/tests"} className={cn(buttonVariants(), ctaClass)}>
        <Sparkles aria-hidden="true" />
        {t("pricing.cta.trial", { days: TRIAL_DAYS })}
      </Link>
    );
  } else if (entitlements.state === "trial") {
    premiumCta = (
      <div className="space-y-2">
        <p className="rounded-lg border border-premium-border bg-premium-soft px-3 py-2 text-center text-sm font-semibold text-premium-text">
          {t("pricing.cta.trialRunning", { days: entitlements.trialDaysLeft ?? 0 })}
        </p>
        <BuyButton className={ctaClass} />
      </div>
    );
  } else if (current === "premium") premiumCta = currentLabel;
  else premiumCta = <BuyButton className={ctaClass} />;

  const schoolCta =
    current === "school" ? (
      currentLabel
    ) : (
      <a href="#school" className={cn(buttonVariants({ variant: "outline" }), ctaClass)}>
        {t("pricing.cta.contact")}
      </a>
    );

  // ---- Premium price for the chosen period ----
  const discount = discountPercent(period);
  const premiumPrice = (
    <>
      <p className="flex items-baseline gap-1.5">
        <span className="text-4xl font-bold tracking-tight text-foreground">{formatGel(PREMIUM_PRICES_GEL[period])} ₾</span>
        <span className="text-muted-foreground">{t(`pricing.per.${period}`)}</span>
      </p>
      <p className="mt-1 min-h-5 text-sm text-muted-foreground">
        {period !== "month" && (
          <>
            {t("pricing.monthlyEquivalent", { price: formatGel(monthlyEquivalent(period)) })}
            {discount > 0 && <span className="font-semibold text-success-text"> · {t("pricing.saveLong", { percent: discount })}</span>}
          </>
        )}
      </p>
    </>
  );

  return (
    <PageTransition className="relative overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[32rem] bg-[radial-gradient(ellipse_at_top,var(--primary-soft),transparent_65%)]"
      />

      {/* ---- Heading and period switch ---- */}
      <section className="mx-auto max-w-3xl px-4 pt-12 pb-10 text-center sm:px-6 lg:pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary-soft-border bg-card px-3 py-1 text-sm font-medium text-brand shadow-xs">
          {t("pricing.eyebrow")}
        </p>
        <h1 className="mt-5 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">{t("pricing.title")}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t("pricing.lead", { days: TRIAL_DAYS })}</p>
        <div className="mt-8 flex justify-center">
          <SegmentedControl<BillingPeriod>
            label={t("pricing.periodLabel")}
            value={period}
            onChange={setPeriod}
            options={BILLING_PERIODS.map((p) => ({
              value: p,
              label: (
                <span className="inline-flex items-center gap-1.5 px-1 py-0.5 text-[15px]">
                  {t(`pricing.period.${p}`)}
                  {discountPercent(p) > 0 && (
                    <span className="rounded-md bg-success-soft px-1.5 text-xs font-semibold text-success-text">
                      {t("pricing.save", { percent: discountPercent(p) })}
                    </span>
                  )}
                </span>
              ),
            }))}
          />
        </div>
        <p className={cn("mt-3 text-sm text-muted-foreground", period !== "schoolYear" && "invisible")} aria-hidden={period !== "schoolYear"}>
          {t("pricing.schoolYearNote")}
        </p>
      </section>

      {/* ---- The three plans ---- */}
      <section className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:items-start" data-plan-cards="">
        <PlanCard
          plan="free"
          name={t("plan.free")}
          tagline={t("pricing.free.tagline")}
          price={
            <p className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold tracking-tight text-foreground">0 ₾</span>
              <span className="text-muted-foreground">{t("pricing.forever")}</span>
            </p>
          }
          cta={freeCta}
          bullets={freeBullets}
          current={current === "free"}
        />
        <PlanCard
          plan="premium"
          name={t("plan.premium")}
          tagline={t("pricing.premium.tagline")}
          price={premiumPrice}
          cta={premiumCta}
          note={!signedIn || entitlements.state === "trial" ? t("pricing.noCard") : undefined}
          bullets={premiumBullets}
          highlight
          current={current === "premium"}
        />
        <PlanCard
          plan="school"
          name={t("plan.school")}
          tagline={t("pricing.school.tagline")}
          price={
            <>
              <p className="text-2xl font-bold tracking-tight text-foreground">{t("pricing.school.price")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("pricing.school.priceNote")}</p>
            </>
          }
          cta={schoolCta}
          bullets={schoolBullets}
          current={current === "school"}
        />
      </section>
      {!ONLINE_PAYMENTS && <p className="mx-auto mt-6 max-w-2xl px-4 text-center text-sm text-muted-foreground">{t("pricing.paymentsSoon")}</p>}

      <Comparison />
      <Faq />

      {/* ---- School plan request ---- */}
      <section id="school" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-20 sm:px-6">
        <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span className="inline-flex shrink-0 rounded-xl bg-primary-soft p-2.5 text-brand">
              <School className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t("school.title")}</h2>
              <p className="mt-1.5 text-[15px] text-muted-foreground">{t("school.lead")}</p>
            </div>
          </div>
          <SchoolRequestForm />
        </div>
      </section>
    </PageTransition>
  );
}

/** "Buy Premium" — opens the payment page once online payments are on (stage 2). */
function BuyButton({ className }: { className: string }) {
  const t = useT();
  return (
    <button type="button" className={cn(buttonVariants(), className)} disabled={!ONLINE_PAYMENTS} data-buy-premium="">
      <Crown aria-hidden="true" />
      {t("pricing.cta.buy")}
    </button>
  );
}

function PlanCard({
  plan,
  name,
  tagline,
  price,
  cta,
  note,
  bullets,
  highlight = false,
  current,
}: {
  plan: PlanId;
  name: string;
  tagline: string;
  price: ReactNode;
  cta: ReactNode;
  note?: string;
  bullets: Bullet[];
  highlight?: boolean;
  current: boolean;
}) {
  const t = useT();
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      data-plan={plan}
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm",
        highlight && "border-primary-soft-border shadow-lg ring-2 ring-primary/80 lg:-mt-3 lg:pb-9",
        current && !highlight && "border-primary-soft-border",
      )}
    >
      {highlight && (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {t("pricing.recommended")}
        </span>
      )}
      <h2 className="flex items-center gap-2 text-xl font-bold">
        {plan === "premium" && <Crown className="size-5 text-premium" aria-hidden="true" />}
        {name}
      </h2>
      <p className="mt-1 min-h-12 text-[15px] text-muted-foreground">{tagline}</p>
      <div className="mt-5">{price}</div>
      {cta && <div className="mt-5">{cta}</div>}
      {note && <p className="mt-2.5 text-center text-sm text-muted-foreground">{note}</p>}
      <ul className="mt-6 space-y-2.5 border-t pt-5 text-[15px]">
        {bullets.map(({ text, soon }) => (
          <li key={text} className="flex gap-2.5">
            <Check className="mt-0.5 size-4.5 shrink-0 text-success" aria-hidden="true" />
            <span className={cn(soon && "text-soft-foreground")}>
              {text}
              {soon && <SoonChip />}
            </span>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

function SoonChip() {
  const t = useT();
  return (
    <span className="ml-1.5 inline-block rounded-md bg-muted px-1.5 py-px align-[1px] text-xs font-medium text-muted-foreground">
      {t("pricing.soon")}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Comparison table
// ---------------------------------------------------------------------------

/** true / false → ✓ / –; a string is shown as it is; "unlimited" → ∞ (short enough for phones). */
type Cell = boolean | string | "unlimited";

function Comparison() {
  const t = useT();
  const has = (feature: Feature) => [PLANS.free, PLANS.premium, PLANS.school].map((p) => p.features.includes(feature));
  const each = (pick: (plan: (typeof PLANS)["free"]) => string) => [PLANS.free, PLANS.premium, PLANS.school].map(pick);
  const templates = (n: number | "all") => (n === "all" ? t("pricing.all") : String(n));

  const rows: { key: string; cells: Cell[]; soon?: boolean }[] = [
    { key: "subjects", cells: [true, true, true] },
    { key: "tests", cells: ["unlimited", "unlimited", "unlimited"] },
    { key: "print", cells: [true, true, true] },
    { key: "variants", cells: each((p) => String(p.limits.maxVariants)) },
    { key: "noFooter", cells: has("noPdfFooter"), soon: !READY.noPdfFooter },
    { key: "images", cells: each((p) => megabytes(p.limits.imageStorageMb)) },
    { key: "ai", cells: each((p) => String(p.limits.aiGenerationsPerMonth)), soon: !READY.aiGenerator },
    { key: "templates", cells: each((p) => templates(p.limits.templates)), soon: !READY.allTemplates },
    { key: "customHeader", cells: has("customHeader"), soon: !READY.customHeader },
    { key: "questionBank", cells: has("questionBank"), soon: !READY.questionBank },
    { key: "docx", cells: has("docxExport"), soon: !READY.docxExport },
    { key: "sharing", cells: has("sharing"), soon: !READY.sharing },
    { key: "schoolAdmin", cells: has("schoolAdmin"), soon: !READY.schoolAdmin },
    { key: "sharedBank", cells: has("sharedBank"), soon: !READY.sharedBank },
    { key: "invoice", cells: [false, false, true] },
  ];

  return (
    <section className="mx-auto max-w-4xl px-4 pt-20 pb-16 sm:px-6">
      <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{t("pricing.compareTitle")}</h2>
      <div className="mt-8 overflow-x-auto rounded-2xl border bg-card shadow-xs">
        <table className="w-full text-left text-[13px] sm:text-[15px]" data-compare-table="">
          <thead>
            <tr className="border-b bg-muted/50 text-sm">
              <th scope="col" className="px-2.5 py-3 font-semibold text-soft-foreground sm:px-4">
                {t("pricing.compareFeature")}
              </th>
              {(["free", "premium", "school"] as const).map((plan) => (
                <th key={plan} scope="col" className={cn("w-[19%] px-1 py-3 text-center font-semibold sm:px-2", plan === "premium" && "text-brand")}>
                  {t(`plan.${plan}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, cells, soon }) => (
              <tr key={key} className="border-b last:border-b-0">
                <th scope="row" className="px-2.5 py-3 font-normal text-foreground sm:px-4">
                  {t(`pricing.row.${key}` as Parameters<typeof t>[0])}
                  {soon && <SoonChip />}
                </th>
                {cells.map((cell, i) => (
                  <td key={i} className={cn("px-1 py-3 text-center sm:px-2", i === 1 && "bg-primary-soft/40")}>
                    {cell === "unlimited" ? (
                      <>
                        <span className="text-lg font-semibold" aria-hidden="true">
                          ∞
                        </span>
                        <span className="sr-only">{t("pricing.unlimited")}</span>
                      </>
                    ) : typeof cell === "string" ? (
                      <span className="font-medium whitespace-nowrap">{cell}</span>
                    ) : cell ? (
                      <>
                        <Check className="mx-auto size-5 text-success" aria-hidden="true" />
                        <span className="sr-only">{t("pricing.yes")}</span>
                      </>
                    ) : (
                      <>
                        <Minus className="mx-auto size-4 text-muted-foreground/60" aria-hidden="true" />
                        <span className="sr-only">{t("pricing.no")}</span>
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Questions and answers
// ---------------------------------------------------------------------------

function Faq() {
  const t = useT();
  const items = [1, 2, 3, 4, 5, 6] as const;
  return (
    <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{t("pricing.faqTitle")}</h2>
      <div className="mt-8 divide-y rounded-2xl border bg-card shadow-xs">
        {items.map((n) => (
          <details key={n} className="group px-5 py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              {t(`pricing.q${n}`)}
              <ChevronDown
                className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="pb-4 text-[15px] leading-relaxed text-muted-foreground">
              {t(`pricing.a${n}`, { free: PLANS.free.limits.maxVariants })}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
