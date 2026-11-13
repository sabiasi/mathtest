"use client";

import { Plus, X } from "lucide-react";
import { Field } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { LinesStepper } from "@/features/editor/questions/OpenAnswerEditor";
import { useT } from "@/i18n/language";
import { LIMITS } from "@/lib/questions";
import type { EssayQuestion } from "@/lib/storage/types";
import { addButtonClass } from "@/subjects/history/editors/RowControls";

/** An essay: number of lines (they continue on the next page if needed), guiding points, expected length. */
export function EssayEditor({ question, onChange }: { question: EssayQuestion; onChange: (question: EssayQuestion) => void }) {
  const t = useT();
  const { guide } = question;
  return (
    <div className="space-y-4" data-essay-editor="">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <LinesStepper id={question.id} value={question.lines} min={0} max={LIMITS.essayLines} onChange={(lines) => onChange({ ...question, lines })} />
        <Field label={t("essay.length")} hint={t("header.optional")} className="min-w-56 flex-1">
          <Input value={question.length} maxLength={100} placeholder={t("essay.lengthPlaceholder")} onChange={(e) => onChange({ ...question, length: e.target.value })} />
        </Field>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-soft-foreground">{t("essay.guide")}</p>
        <ul className="space-y-2">
          {guide.map((point, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="text-muted-foreground" aria-hidden="true">•</span>
              <Input
                className="h-9 min-w-0 flex-1"
                value={point}
                maxLength={300}
                placeholder={t("essay.guidePlaceholder")}
                aria-label={t("essay.guidePoint", { number: index + 1 })}
                onChange={(e) => onChange({ ...question, guide: guide.map((g, i) => (i === index ? e.target.value : g)) })}
              />
              <IconButton label={t("list.remove")} tone="danger" className="p-1.5" onClick={() => onChange({ ...question, guide: guide.filter((_, i) => i !== index) })}>
                <X className="size-4" aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={`${addButtonClass} mt-1`}
          disabled={guide.length >= LIMITS.guidePoints}
          onClick={() => onChange({ ...question, guide: [...guide, ""] })}
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("essay.addGuide")}
        </button>
      </div>
    </div>
  );
}
