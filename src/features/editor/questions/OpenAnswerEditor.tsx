"use client";

import { Minus, Plus } from "lucide-react";
import { useT } from "@/i18n/language";
import { MAX_LINES } from "@/lib/questions";
import type { OpenAnswerQuestion } from "@/lib/storage/types";

const PREVIEW_LINES = 6;

export function OpenAnswerEditor({
  question,
  onChange,
}: {
  question: OpenAnswerQuestion;
  onChange: (question: OpenAnswerQuestion) => void;
}) {
  const t = useT();
  const { lines } = question;
  const setLines = (n: number) => onChange({ ...question, lines: Math.min(MAX_LINES, Math.max(0, n)) });

  const stepButton =
    "flex size-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 pointer-coarse:size-11";

  return (
    <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700" id={`${question.id}-lines`}>
          {t("oa.lines")}
        </p>
        <div className="flex items-center gap-2" role="group" aria-labelledby={`${question.id}-lines`}>
          <button type="button" className={stepButton} onClick={() => setLines(lines - 1)} disabled={lines <= 0} aria-label={t("common.decrease")}>
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <span className="w-8 text-center text-lg font-semibold tabular-nums" aria-live="polite">
            {lines}
          </span>
          <button type="button" className={stepButton} onClick={() => setLines(lines + 1)} disabled={lines >= MAX_LINES} aria-label={t("common.increase")}>
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {lines > 0 && (
        <div className="min-w-48 flex-1" aria-hidden="true">
          <p className="mb-1.5 text-sm text-slate-500">{t("oa.preview")}</p>
          <div className="rounded-lg bg-slate-50 px-4 py-1">
            {Array.from({ length: Math.min(lines, PREVIEW_LINES) }, (_, i) => (
              <div key={i} className="h-6 border-b border-slate-300" />
            ))}
            {lines > PREVIEW_LINES && (
              <p className="py-1 text-center text-xs text-slate-400">… +{lines - PREVIEW_LINES}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
