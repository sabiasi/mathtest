"use client";

import { Minus, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/form";
import { useT } from "@/i18n/language";
import { MAX_LINES } from "@/lib/questions";
import type { OpenAnswerQuestion } from "@/lib/storage/types";

const PREVIEW_LINES = 6;

/** "Lines for working: [−] 5 [+]" — also used by the Given / Find / Solution question. */
export function LinesStepper({ id, value, min, onChange }: { id: string; value: number; min: number; onChange: (lines: number) => void }) {
  const t = useT();
  const set = (n: number) => onChange(Math.min(MAX_LINES, Math.max(min, n)));
  const stepButton = buttonVariants({ variant: "outline", size: "icon-sm" });
  return (
    <div>
      <FieldLabel id={`${id}-lines`}>{t("oa.lines")}</FieldLabel>
      <div className="flex items-center gap-2" role="group" aria-labelledby={`${id}-lines`}>
        <button type="button" className={stepButton} onClick={() => set(value - 1)} disabled={value <= min} aria-label={t("common.decrease")}>
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span className="w-8 text-center text-lg font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button type="button" className={stepButton} onClick={() => set(value + 1)} disabled={value >= MAX_LINES} aria-label={t("common.increase")}>
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function OpenAnswerEditor({
  question,
  onChange,
}: {
  question: OpenAnswerQuestion;
  onChange: (question: OpenAnswerQuestion) => void;
}) {
  const t = useT();
  const { lines } = question;

  return (
    <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
      <LinesStepper id={question.id} value={lines} min={0} onChange={(n) => onChange({ ...question, lines: n })} />

      {lines > 0 && (
        <div className="min-w-48 flex-1" aria-hidden="true">
          <p className="mb-1.5 text-sm text-muted-foreground">{t("oa.preview")}</p>
          <div className="paper rounded-lg border px-4 py-1">
            {Array.from({ length: Math.min(lines, PREVIEW_LINES) }, (_, i) => (
              <div key={i} className="h-6 border-b border-neutral-300" />
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
