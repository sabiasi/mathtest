"use client";

import {
  ArrowRight,
  Grid3x3,
  KeyRound,
  Layers,
  ListChecks,
  MousePointerClick,
  Printer,
  Shuffle,
  type LucideIcon,
} from "lucide-react";
import { convertLatexToMarkup } from "mathlive";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { SubjectIcon } from "@/features/subjects/SubjectPicker";
import { useLanguage, useT } from "@/i18n/language";
import { optionLabel } from "@/lib/questions";
import { SUBJECTS } from "@/subjects/registry";

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

  return (
    <div className="relative overflow-x-clip">
      {/* A soft glow behind the top of the page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[36rem] bg-[radial-gradient(ellipse_at_top,var(--primary-soft),transparent_65%)]"
      />

      {/* ---- Hero ---- */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-24">
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-full border border-primary-soft-border bg-card px-3 py-1 text-sm font-medium text-brand shadow-xs">
            <LogoMark className="size-4" />
            {t("landing.badge")}
          </p>
          <h1 className="mt-5 text-4xl leading-[1.15] font-bold tracking-tight text-balance text-foreground sm:text-5xl">
            {t("landing.title")}{" "}
            <span className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent dark:from-[#a5b4fc] dark:to-[#c4b5fd]">
              {t("landing.titleAccent")}
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("landing.lead")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {startButton}
            {!signedIn && accounts && tryButton}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{t("landing.note")}</p>
          {!signedIn && accounts && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("landing.haveAccount")}{" "}
              <Link href="/signin" className="font-medium text-brand underline-offset-4 hover:underline">
                {t("landing.signIn")}
              </Link>
            </p>
          )}
        </Reveal>

        <Reveal delay={0.08}>
          <PaperPreview />
        </Reveal>
      </section>

      {/* ---- Subjects ---- */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6" data-landing-subjects="">
        <Reveal>
          <h2 className="text-center text-lg font-semibold text-foreground">{t("landing.subjectsTitle")}</h2>
          <ul className="mt-5 flex flex-wrap justify-center gap-3">
            {SUBJECTS.map(({ id }) => (
              <li key={id} className="flex items-center gap-2.5 rounded-xl border bg-card py-2 pr-4 pl-2 shadow-xs">
                <SubjectIcon id={id} />
                <span className="font-medium text-foreground">{t(`subject.${id}`)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-sm text-muted-foreground">{t("landing.subjectsMore")}</p>
        </Reveal>
      </section>

      {/* ---- Features ---- */}
      <section className="border-y bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.featuresTitle")}</h2>
            <p className="mt-3 text-[17px] text-muted-foreground">{t("landing.featuresLead")}</p>
          </Reveal>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ Icon, n }, i) => (
              <Reveal as="li" key={n} delay={i * 0.04}>
                <div className="h-full rounded-2xl border bg-card p-5 shadow-xs transition-[box-shadow,border-color,translate] duration-200 hover:border-primary-soft-border hover:shadow-md motion-safe:hover:-translate-y-0.5">
                  <span className="inline-flex rounded-xl bg-primary-soft p-2.5 text-brand">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-semibold text-foreground">{t(`landing.f${n}Title`)}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{t(`landing.f${n}Text`)}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.stepsTitle")}</h2>
        </Reveal>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {([1, 2, 3] as const).map((n, i) => (
            <Reveal as="li" key={n} delay={i * 0.06} className="relative flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-sm">
                {n}
              </span>
              <div>
                <h3 className="font-semibold text-foreground">{t(`landing.s${n}Title`)}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{t(`landing.s${n}Text`)}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---- Final call to action ---- */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Reveal className="flex flex-col items-start gap-6 rounded-3xl bg-primary px-6 py-10 text-primary-foreground shadow-lg sm:px-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("landing.ctaTitle")}</h2>
            <p className="mt-2 text-[17px] text-white/80">{t("landing.ctaText")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={startHref} className={buttonVariants({ size: "lg", className: "group bg-white text-[#3730a3] hover:bg-white/90" })}>
              {signedIn ? t("home.title") : accounts ? t("landing.start") : t("landing.try")}
              <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            {!signedIn && accounts && (
              <Link href="/tests" className={buttonVariants({ size: "lg", variant: "ghost", className: "text-white hover:bg-white/15 hover:text-white" })}>
                {t("landing.try")}
              </Link>
            )}
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
      <div className="paper relative rotate-1 rounded-xl border p-6 text-[14px] leading-relaxed shadow-xl transition-transform duration-300 hover:rotate-0 sm:p-8">
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

      {/* A floating piece of the formula toolbar */}
      <div className="absolute -bottom-6 -left-2 flex items-center gap-1 rounded-xl border bg-popover p-1.5 shadow-lg sm:-left-6">
        <span className="px-1.5 text-xs font-medium text-muted-foreground">{t("landing.previewToolbar")}</span>
        {["\\frac{\\square}{\\square}", "x^{\\square}", "\\sqrt{\\square}", "\\pi"].map((latex) => (
          <span
            key={latex}
            className="flex h-8 min-w-8 items-center justify-center rounded-lg border bg-card px-1.5 text-foreground"
          >
            <span className="toolbar-math" dangerouslySetInnerHTML={{ __html: convertLatexToMarkup(latex) }} />
          </span>
        ))}
      </div>
    </div>
  );
}
