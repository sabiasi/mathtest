"use client";

import {
  ArrowRight,
  Check,
  Grid3x3,
  KeyRound,
  Layers,
  ListChecks,
  MessageSquareQuote,
  MousePointerClick,
  Printer,
  Shuffle,
  type LucideIcon,
  FileText,
} from "lucide-react";
import { convertLatexToMarkup } from "mathlive";
import { motion } from "motion/react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { SubjectIcon } from "@/features/subjects/SubjectPicker";
import { useLanguage, useT } from "@/i18n/language";
import { formatGel, monthlyEquivalent } from "@/lib/plans/pricing";
import { PLANS, TRIAL_DAYS } from "@/lib/plans/plans";
import { optionLabel } from "@/lib/questions";
import { cn } from "@/lib/utils";
import { SUBJECTS } from "@/subjects/registry";
import { HeroDemo } from "./HeroDemo";

/**
 * The landing page: what MathTest does, "Get started" (sign up) and
 * "Try without signing up" (guest mode: tests stay in the browser).
 */
export function LandingView() {
  const t = useT();
  const { status } = useAuth();
  const signedIn = status === "signed-in";
  // Accounts not set up yet (no Supabase): trying is the only way in.
  const accounts = status !== "unconfigured";

  // Signed-in teachers go to their tests; visitors sign up — or just try it.
  const startHref = signedIn ? "/tests" : accounts ? "/signup" : "/tests";
  const startButton = (
    <Link href={startHref} className={buttonVariants({ size: "lg", className: "group" })}>
      {signedIn ? t("home.title") : accounts ? t("landing.start") : t("landing.try")}
      <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
  const tryButton = (
    <Link href="/tests" className={buttonVariants({ size: "lg", variant: "outline" })} data-try-button="">
      <MousePointerClick className="size-5" aria-hidden="true" />
      {t("landing.try")}
    </Link>
  );

  const features: { Icon: LucideIcon; n: 1 | 2 | 3 | 4 | 5 | 6 }[] = [
    { Icon: Layers, n: 1 },
    { Icon: ListChecks, n: 2 },
    { Icon: Printer, n: 3 },
    { Icon: KeyRound, n: 4 },
    { Icon: Shuffle, n: 5 },
    { Icon: Grid3x3, n: 6 },
  ];

  const sectionTitle = "text-3xl font-bold tracking-tight text-balance sm:text-4xl";
  const eyebrow = "text-sm font-semibold tracking-wide text-brand uppercase";

  return (
    <div className="relative overflow-x-clip">
      {/* Behind the top of the page: a faint grid and two soft lights */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[52rem]">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute top-[-14rem] left-1/2 h-[34rem] w-[60rem] max-w-[140vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)] opacity-70 blur-2xl" />
        <div className="absolute top-40 right-[8%] h-64 w-64 rounded-full bg-[radial-gradient(closest-side,oklch(0.7_0.17_320/0.22),transparent)] blur-2xl max-md:hidden" />
      </div>

      {/* ---- Hero ---- */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 lg:pt-16">
        {/* The hero fades in with plain CSS (.hero-in), not JavaScript: on a slow
            phone the headline must be visible before the scripts arrive. */}
        <div className="hero-in mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="glass inline-flex items-center gap-2 rounded-full border border-primary-soft-border px-3.5 py-1 text-sm font-medium text-brand shadow-xs">
            <LogoMark className="size-4" />
            {t("landing.badge")}
          </p>
          <h1 className="mt-6 text-[2.4rem] leading-[1.1] font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
            {t("landing.title")} <span className="text-gradient">{t("landing.titleAccent")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">{t("landing.lead")}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {startButton}
            {!signedIn && accounts && tryButton}
          </div>
          <Link href="/print/sample-math" className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-brand hover:underline" data-see-sample="">
            <FileText className="size-4" aria-hidden="true" />
            {t("landing.seeSample")}
          </Link>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">{t("landing.note")}</p>
          {!signedIn && accounts && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("landing.haveAccount")}{" "}
              <Link href="/signin" className="font-medium text-brand underline-offset-4 hover:underline">
                {t("landing.signIn")}
              </Link>
            </p>
          )}
        </div>

        {/* The live demo (a test being built) and the paper it becomes */}
        <div className="hero-in relative mx-auto mt-12 max-w-5xl pb-10 [animation-delay:90ms] lg:mt-14">
          <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-0">
            <div className="relative z-10">
              <HeroDemo />
            </div>
            <div className="lg:-ml-10 lg:translate-y-8">
              <PaperPreview />
            </div>
          </div>
          <p className="mx-auto mt-12 max-w-xl text-center text-[15px] text-muted-foreground">{t("landing.demoCaption")}</p>
        </div>
      </section>

      {/* ---- Subjects ---- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24" data-landing-subjects="">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className={sectionTitle}>{t("landing.subjectsTitle")}</h2>
          <p className="mt-4 text-[17px] text-muted-foreground">{t("landing.subjectsLead")}</p>
        </Reveal>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SUBJECTS.map(({ id }, i) => (
            <Reveal as="li" key={id} delay={(i % 4) * 0.04}>
              {/* Each subject opens its sample test (the printed paper). */}
              <Link
                href={`/print/sample-${id}`}
                className="accent-card group flex h-full flex-col rounded-2xl border bg-card p-5 shadow-xs"
                style={{ "--accent-color": `var(--subject-${id})` } as CSSProperties}
              >
                <SubjectIcon id={id} className="self-start p-2.5" iconClassName="size-6" />
                <h3 className="mt-4 text-[17px] font-semibold text-foreground">{t(`subject.${id}`)}</h3>
                <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-muted-foreground">{t(`landing.subj.${id}`)}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-color)]">
                  {t("landing.subjectOpen")}
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
        <p className="mt-6 text-center text-sm text-muted-foreground">{t("landing.subjectsMore")}</p>
      </section>

      {/* ---- Features ---- */}
      <section className="border-y bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <Reveal className="max-w-2xl">
            <h2 className={sectionTitle}>{t("landing.featuresTitle")}</h2>
            <p className="mt-4 text-[17px] text-muted-foreground">{t("landing.featuresLead")}</p>
          </Reveal>
          {/* The first and the last card are wide, so the grid reads as a showcase, not a list. */}
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ Icon, n }, i) => (
              <Reveal as="li" key={n} delay={(i % 3) * 0.04} className={cn((n === 1 || n === 6) && "lg:col-span-2", n !== 1 && n !== 6 && "lg:col-span-1")}>
                <div className="accent-card flex h-full flex-col rounded-2xl border bg-background p-6 shadow-xs">
                  <span className="inline-flex self-start rounded-xl bg-primary-soft p-2.5 text-brand ring-1 ring-primary-soft-border">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold text-foreground">{t(`landing.f${n}Title`)}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{t(`landing.f${n}Text`)}</p>
                  {n === 5 && (
                    <div className="mt-auto flex gap-1.5 pt-4" aria-hidden="true">
                      {["A", "B", "C", "D", "E", "F"].map((v) => (
                        <span key={v} className="flex size-7 items-center justify-center rounded-md border bg-card text-xs font-bold text-soft-foreground">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <Reveal>
          <h2 className={sectionTitle}>{t("landing.stepsTitle")}</h2>
        </Reveal>
        <ol className="relative mt-10 grid gap-8 md:grid-cols-3">
          {/* The line that joins the three steps (wide screens) */}
          <span aria-hidden="true" className="absolute top-5 right-[17%] left-[5%] h-px bg-gradient-to-r from-primary-soft-border via-primary-soft-border to-transparent max-md:hidden" />
          {([1, 2, 3] as const).map((n, i) => (
            <Reveal as="li" key={n} delay={i * 0.06} className="relative">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-[0_0_0_6px_var(--background),0_6px_18px_-6px_var(--glow)]">
                {n}
              </span>
              <h3 className="mt-4 text-[17px] font-semibold text-foreground">{t(`landing.s${n}Title`)}</h3>
              <p className="mt-1.5 max-w-xs text-[15px] leading-relaxed text-muted-foreground">{t(`landing.s${n}Text`)}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---- Pricing teaser (numbers come from lib/plans/plans.ts) ---- */}
      <section className="border-y bg-card/60" data-landing-pricing="">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-24">
          <Reveal>
            <p className={eyebrow}>{t("landing.pricingEyebrow")}</p>
            <h2 className={cn(sectionTitle, "mt-2")}>{t("landing.pricingTitle")}</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">{t("landing.pricingLead", { days: TRIAL_DAYS })}</p>
            <Link href="/pricing" className={buttonVariants({ variant: "outline", className: "group mt-6" })}>
              {t("landing.pricingMore")}
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            <Reveal className="rounded-2xl border bg-background p-6 shadow-xs">
              <h3 className="text-lg font-semibold">{t("landing.planFree")}</h3>
              <p className="mt-1 text-3xl font-bold tracking-tight">0 ₾</p>
              <p className="mt-2 text-[15px] text-muted-foreground">{t("landing.planFreeText")}</p>
              <ul className="mt-5 space-y-2.5 text-[15px] text-soft-foreground">
                {([1, 2, 3] as const).map((n) => (
                  <li key={n} className="flex gap-2">
                    <Check className="mt-0.5 size-4.5 shrink-0 text-success" aria-hidden="true" />
                    {t(`landing.planFree${n}`)}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.06} className="relative rounded-2xl border border-premium-border bg-background p-6 shadow-[var(--elevation-md),0_18px_40px_-20px_var(--premium)]">
              <span className="absolute -top-3 right-5 rounded-full border border-premium-border bg-premium-soft px-2.5 py-0.5 text-xs font-semibold text-premium-text">
                {t("pricing.recommended")}
              </span>
              <h3 className="text-lg font-semibold">{t("landing.planPremium")}</h3>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="text-3xl font-bold tracking-tight">{formatGel(monthlyEquivalent("year"))} ₾</span>
                <span className="text-sm text-muted-foreground">{t("landing.planFrom")}</span>
              </p>
              <p className="mt-2 text-[15px] text-muted-foreground">{t("landing.planPremiumText")}</p>
              <ul className="mt-5 space-y-2.5 text-[15px] text-soft-foreground">
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-4.5 shrink-0 text-premium" aria-hidden="true" />
                  {t("landing.planPremium1", { count: PLANS.premium.limits.maxVariants })}
                </li>
                {([2, 3] as const).map((n) => (
                  <li key={n} className="flex gap-2">
                    <Check className="mt-0.5 size-4.5 shrink-0 text-premium" aria-hidden="true" />
                    {t(`landing.planPremium${n}`)}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- Testimonials: PLACEHOLDERS until real reviews arrive (texts: landing.testimonial* in dictionaries.ts) ---- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24" data-landing-testimonials="placeholder">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className={sectionTitle}>{t("landing.testimonialsTitle")}</h2>
          <p className="mt-4 text-[17px] text-muted-foreground">{t("landing.testimonialsNote")}</p>
        </Reveal>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Reveal as="li" key={i} delay={i * 0.05}>
              <figure className="flex h-full flex-col rounded-2xl border-2 border-dashed bg-card/50 p-6">
                <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning-text ring-1 ring-warning-border">
                  <MessageSquareQuote className="size-3.5" aria-hidden="true" />
                  {t("landing.placeholderBadge")}
                </span>
                <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-muted-foreground italic">{t("landing.testimonialPlaceholder")}</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="size-10 rounded-full bg-muted" aria-hidden="true" />
                  <span className="text-sm text-muted-foreground">{t("landing.testimonialWho")}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* ---- Final call to action ---- */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Reveal className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-primary-foreground shadow-[var(--elevation-lg),0_30px_60px_-30px_var(--glow)] sm:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full bg-white/15 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-1/4 size-80 rounded-full bg-[oklch(0.7_0.2_320/0.35)] blur-3xl" />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.ctaTitle")}</h2>
              <p className="mt-2 text-[17px] text-white/85">{t("landing.ctaText")}</p>
            </div>
            <div className="flex flex-wrap gap-3 md:shrink-0">
              <Link href={startHref} className={buttonVariants({ size: "lg", className: "group bg-white! text-[#3730a3]! shadow-lg hover:bg-white/90!" })}>
                {signedIn ? t("home.title") : accounts ? t("landing.start") : t("landing.try")}
                <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              {!signedIn && accounts && (
                <Link href="/tests" className={buttonVariants({ size: "lg", variant: "ghost", className: "text-white hover:bg-white/15 hover:text-white" })}>
                  {t("landing.try")}
                </Link>
              )}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

/** Fades content in (and up a little) when it scrolls into view — once. */
function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li";
}) {
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, delay, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </Tag>
  );
}

/** Static math drawn by MathLive (the same engine as the editor and print). */
function M({ latex }: { latex: string }) {
  return <span className="math-static" dangerouslySetInnerHTML={{ __html: convertLatexToMarkup(latex) }} />;
}

/** A small, tilted "printed exam" that shows what the app makes. Always white paper. */
function PaperPreview() {
  const t = useT();
  const labelStyle = useLanguage() === "en" ? "latin" : "georgian";
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
      <div className="paper relative rotate-2 rounded-xl border p-6 text-[14px] leading-relaxed shadow-xl transition-transform duration-300 hover:rotate-0 sm:p-8">
        <p className="text-center text-[17px] font-bold">{t("landing.previewTitle")}</p>
        <p className="mt-0.5 text-center text-[12px] text-neutral-600">{t("landing.previewMeta")}</p>
        <div className="mt-3 flex gap-4 border-y border-neutral-800 py-1.5 text-[12px]">
          <span className="flex-1">
            {t("print.studentName")}: <span className="inline-block w-24 border-b border-neutral-800" />
          </span>
          <span>
            {t("print.score")}: ___ / 10
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p>
              <b>1.</b> {t("landing.previewQ1")} <M latex="\frac{3}{4}+\frac{1}{6}" />
            </p>
            <div className="mt-1.5 grid grid-cols-4 gap-2 pl-4 text-[13px]">
              {["\\frac{11}{12}", "\\frac{4}{10}", "\\frac{2}{3}", "1"].map((latex, i) => (
                <span key={latex}>
                  <b>{optionLabel(i, labelStyle)})</b> <M latex={latex} />
                </span>
              ))}
            </div>
          </div>
          <div>
            <p>
              <b>2.</b> {t("landing.previewQ2")} <M latex="x^2-5x+6=0" />
            </p>
            <div className="mt-2 space-y-2.5 pl-4">
              <div className="h-4 border-b border-neutral-300" />
              <div className="h-4 border-b border-neutral-300" />
            </div>
          </div>
          <div>
            <p>
              <b>3.</b> {t("landing.previewQ3")} <M latex="\sqrt{49}+2^3=15" />
            </p>
            <div className="mt-1.5 flex gap-6 pl-4 text-[13px]">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-full border border-neutral-800" /> {t("tf.true")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-full border border-neutral-800" /> {t("tf.false")}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
