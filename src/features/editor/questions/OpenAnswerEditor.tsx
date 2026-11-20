"use client";

import { Minus, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { FieldLabel, SegmentedControl } from "@/components/ui/form";
import { useT } from "@/i18n/language";
import { MAX_LINES } from "@/lib/questions";
import type { OpenAnswerQuestion } from "@/lib/storage/types";

const PREVIEW_LINES = 6;

/** "Lines for working: [−] 5 [+]" — also used by the Given / Find / Solution question. */
export function LinesStepper({
  id,
  value,
  min,
  max = MAX_LINES,
  onChange,
  label = "oa.lines",
}: {
  id: string;
  value: number;
  min: number;
  max?: number;
  onChange: (lines: number) => void;
  label?: "oa.lines" | "oa.space";
}) {
  const t = useT();
  const set = (n: number) => onChange(Math.min(max, Math.max(min, n)));
  const stepButton = buttonVariants({ variant: "outline", size: "icon-sm" });
  return (
    <div>
      <FieldLabel id={`${id}-lines`}>{t(label)}</FieldLabel>
      <div className="flex items-center gap-2" role="group" aria-labelledby={`${id}-lines`}>
        <button type="button" className={stepButton} onClick={() => set(value - 1)} disabled={value <= min} aria-label={t("common.decrease")}>
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span className="w-8 text-center text-lg font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button type="button" className={stepButton} onClick={() => set(value + 1)} disabled={value >= max} aria-label={t("common.increase")}>
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function OpenAnswerEditor({
  question,
  onChange,
  defaultSpace = "lines",
}: {
  question: OpenAnswerQuestion;
  onChange: (question: OpenAnswerQuestion) => void;
  /** The subject's default when the teacher hasn't chosen (toolkit print.openAnswerSpace). */
  defaultSpace?: "lines" | "blank";
}) {
  const t = useT();
  const { lines } = question;
  const space = question.answerSpace ?? defaultSpace;
  const blank = space === "blank";

  return (
    <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
      <LinesStepper id={question.id} value={lines} min={0} onChange={(n) => onChange({ ...question, lines: n })} label={blank ? "oa.space" : "oa.lines"} />

      <div data-open-answer-space={space}>
        <FieldLabel>{t("oa.style")}</FieldLabel>
        <SegmentedControl
          label={t("oa.style")}
          value={space}
          onChange={(answerSpace) => onChange({ ...question, answerSpace })}
          options={[
            { value: "lines", label: t("oa.style.lines") },
            { value: "blank", label: t("oa.style.blank") },
          ]}
        />
      </div>

      {lines > 0 && (
        <div className="min-w-48 flex-1" aria-hidden="true">
          <p className="mb-1.5 text-sm text-muted-foreground">{t("oa.preview")}</p>
          <div className="paper rounded-lg border px-4 py-1" data-open-answer-preview={blank ? "blank" : "lines"}>
            {Array.from({ length: Math.min(lines, PREVIEW_LINES) }, (_, i) => (
              <div key={i} className={blank ? "h-6" : "h-6 border-b border-neutral-300"} />
            ))}
            {lines > PREVIEW_LINES && (
              <p className="py-1 text-center text-xs text-neutral-500">… +{lines - PREVIEW_LINES}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
