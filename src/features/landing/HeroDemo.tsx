"use client";

import { Check, CloudCheck } from "lucide-react";
import { convertLatexToMarkup } from "mathlive";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SubjectIcon } from "@/features/subjects/SubjectPicker";
import { useLanguage, useT } from "@/i18n/language";
import type { MessageKey } from "@/i18n/dictionaries";
import { optionLabel } from "@/lib/questions";
import { cn } from "@/lib/utils";
import type { SubjectId } from "@/subjects/ids";

/**
 * The landing page's "live demo": a small pretend editor in which a question
 * writes itself — the text is typed, a toolbar button is pressed, a formula
 * appears, then the answers. It goes through three subjects and starts over.
 *
 * It is only a picture (aria-hidden, nothing can be clicked). Everything is
 * driven by ONE counter (`tick`), so there are no timers to keep in sync.
 * With "reduce motion" switched on it simply shows a finished question.
 */

type Scene = {
  subject: SubjectId;
  question: MessageKey;
  /** The formula that appears after the text (LaTeX). */
  formula: string;
  /** Toolbar buttons shown for this subject; `press` is the one that gets "clicked". */
  tools: string[];
  press: number;
  /** Four answers; the first one is correct. */
  options: string[];
};

const SCENES: Scene[] = [
  {
    subject: "math",
    question: "landing.demoQ1",
    formula: "x^2-5x+6=0",
    tools: ["\\frac{\\square}{\\square}", "x^{\\square}", "\\sqrt{\\square}", "\\pi", "\\le", "\\infty"],
    press: 1,
    options: ["x_1=2,\\;x_2=3", "x_1=-2,\\;x_2=-3", "x_1=1,\\;x_2=6", "x_1=-1,\\;x_2=6"],
  },
  {
    subject: "physics",
    question: "landing.demoQ2",
    formula: "m=2\\,\\mathrm{kg},\\;a=3\\,\\mathrm{m/s^2}",
    tools: ["\\vec{F}", "\\Delta", "\\mathrm{m/s}", "\\Omega", "\\lambda", "a\\cdot10^{n}"],
    press: 2,
    options: ["6\\,\\mathrm{N}", "5\\,\\mathrm{N}", "1{,}5\\,\\mathrm{N}", "9\\,\\mathrm{N}"],
  },
  {
    subject: "chemistry",
    question: "landing.demoQ3",
    formula: "\\ce{2H2 + O2 ->}",
    tools: ["\\ce{H2O}", "\\ce{->}", "\\ce{<=>}", "\\uparrow", "\\downarrow", "\\ce{Fe^3+}"],
    press: 1,
    options: ["\\ce{2H2O}", "\\ce{H2O2}", "\\ce{2HO}", "\\ce{H2O}"],
  },
];

const TICK_MS = 55; // one typed letter
const PAUSE_AFTER_TEXT = 5; // ticks before the toolbar button is pressed
const OPTION_GAP = 5; // ticks between two answers appearing
const HOLD = 45; // ticks the finished question stays (≈ 2.5 s)

/** When each thing happens in a scene, in ticks. */
function timeline(textLength: number) {
  const press = textLength + PAUSE_AFTER_TEXT;
  const formula = press + 3;
  const options = formula + 6;
  const correct = options + 4 * OPTION_GAP + 2;
  const saved = correct + 5;
  return { press, formula, options, correct, saved, end: saved + HOLD };
}

const markupCache = new Map<string, string>();
function Math_({ latex, className }: { latex: string; className?: string }) {
  let html = markupCache.get(latex);
  if (html === undefined) {
    html = convertLatexToMarkup(latex);
    markupCache.set(latex, html);
  }
  return <span className={cn("math-static", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Fades and rises in when `show` becomes true (keeps its room, so nothing jumps). */
const appear = (show: boolean) => cn("transition-[opacity,translate,scale] duration-300 ease-out-soft", show ? "opacity-100" : "translate-y-1 scale-[0.97] opacity-0");

export function HeroDemo() {
  const t = useT();
  const labelStyle = useLanguage() === "en" ? "latin" : "georgian";
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });

  // The server (and the first paint) show a FINISHED question: the page has
  // its content at once; the animation then continues from there.
  const [state, setState] = useState({ scene: 0, tick: Number.MAX_SAFE_INTEGER });

  useEffect(() => {
    // Only runs while the demo is on screen and movement is wanted.
    if (reduced || !inView) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      setState(({ scene, tick }) => {
        const length = t(SCENES[scene].question).length;
        const end = timeline(length).end;
        // A finished scene (also the very first one) waits HOLD ticks, then the next begins.
        if (tick > end + HOLD) return { scene, tick: end - HOLD };
        return tick >= end ? { scene: (scene + 1) % SCENES.length, tick: 0 } : { scene, tick: tick + 1 };
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [reduced, inView, t]);

  const scene = SCENES[state.scene];
  const text = t(scene.question);
  const at = timeline(text.length);
  const tick = state.tick;
  const typing = tick < text.length;
  const pressed = tick >= at.press && tick < at.formula + 3;

  return (
    <div ref={ref} aria-hidden="true" className="glass relative overflow-hidden rounded-2xl border shadow-xl select-none" data-hero-demo="">
      {/* Window bar */}
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <span className="flex gap-1.5">
          <i className="size-2.5 rounded-full bg-foreground/15" />
          <i className="size-2.5 rounded-full bg-foreground/15" />
          <i className="size-2.5 rounded-full bg-foreground/15" />
        </span>
        <span className="ml-2 text-sm font-medium text-soft-foreground">{t("landing.demoWindow")}</span>
        <span className={cn("ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-success-text", appear(tick >= at.saved))}>
          <CloudCheck className="size-4" />
          {t("landing.demoSaved")}
        </span>
      </div>

      {/* Subjects: the one being shown is lit */}
      <div className="flex gap-1.5 px-4 pt-3">
        {SCENES.map((s, i) => (
          <span
            key={s.subject}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border py-1 pr-2.5 pl-1 text-[13px] font-medium transition-colors duration-300",
              i === state.scene ? "border-primary-soft-border bg-primary-soft text-foreground" : "border-transparent text-muted-foreground",
            )}
          >
            <SubjectIcon id={s.subject} className="rounded-md p-1" iconClassName="size-3.5" />
            <span className={cn(i !== state.scene && "max-sm:hidden")}>{t(`subject.${s.subject}`)}</span>
          </span>
        ))}
      </div>

      {/* The subject's toolbar */}
      <div className="flex gap-1 px-4 pt-3">
        {scene.tools.map((latex, i) => (
          <span
            key={`${scene.subject}:${latex}`}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center rounded-lg border bg-card px-2 text-foreground shadow-xs transition-[background-color,border-color,scale,box-shadow] duration-150",
              i === scene.press && pressed && "scale-95 border-primary bg-primary-soft shadow-[0_0_0_3px_var(--glow)]",
              i > 3 && "max-sm:hidden",
            )}
          >
            <Math_ latex={latex} className="toolbar-math" />
          </span>
        ))}
      </div>

      {/* The question being written */}
      <div className="p-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-brand">{state.scene + 1}</span>
            <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-[13px] font-medium text-soft-foreground">{t("landing.demoPoints")}</span>
          </div>
          <p className="mt-3 min-h-[3.75rem] text-[15px] leading-8 text-foreground">
            {typing ? text.slice(0, tick) : text}
            {typing && <span className="demo-caret" />}{" "}
            <span className={cn("inline-block rounded-md bg-[var(--math-bg)] px-1.5", appear(tick >= at.formula))}>
              <Math_ latex={scene.formula} />
            </span>
          </p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {scene.options.map((latex, i) => {
              const right = i === 0 && tick >= at.correct;
              return (
                <li
                  key={`${scene.subject}:${i}`}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[14px] transition-colors duration-300",
                    right ? "border-success-border bg-success-soft" : "bg-card",
                    appear(tick >= at.options + i * OPTION_GAP),
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300",
                      right ? "border-success bg-success text-white" : "text-soft-foreground",
                    )}
                  >
                    {right ? <Check className="size-3.5" /> : optionLabel(i, labelStyle)}
                  </span>
                  <Math_ latex={latex} />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
