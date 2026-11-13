"use client";

import { Plus, Quote } from "lucide-react";
import { FieldLabel } from "@/components/ui/form";
import { LinesStepper } from "@/features/editor/questions/OpenAnswerEditor";
import { RichTextInput } from "@/features/math/RichTextInput";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { LIMITS, optionLabel } from "@/lib/questions";
import type { LabelStyle, SourcePart, SourceQuestion } from "@/lib/storage/types";
import { RowControls, addButtonClass, move } from "./RowControls";

/**
 * Source-based question: the document or quote, where it's from, and the
 * questions about it (ა, ბ, გ…), each with lines for the answer and an
 * optional expected answer for the key.
 */
export function SourceEditor({
  question,
  labelStyle,
  onChange,
}: {
  question: SourceQuestion;
  labelStyle: LabelStyle;
  onChange: (question: SourceQuestion) => void;
}) {
  const t = useT();
  const { parts } = question;
  const setPart = (id: string, changes: Partial<SourcePart>) =>
    onChange({ ...question, parts: parts.map((p) => (p.id === id ? { ...p, ...changes } : p)) });

  return (
    <div className="space-y-5" data-source-editor="">
      <div className="rounded-xl border-l-4 border-primary-soft-border bg-muted/40 p-3">
        <FieldLabel>
          <Quote className="mr-1.5 inline size-4 align-[-2px] text-brand" aria-hidden="true" />
          {t("source.text")}
        </FieldLabel>
        <RichTextInput
          value={question.source}
          ariaLabel={t("source.text")}
          placeholder={t("source.textPlaceholder")}
          onChange={(source) => onChange({ ...question, source })}
        />
        <div className="mt-3">
          <FieldLabel hint={t("header.optional")}>{t("source.caption")}</FieldLabel>
          <RichTextInput
            singleLine
            value={question.sourceCaption}
            ariaLabel={t("source.caption")}
            placeholder={t("source.captionPlaceholder")}
            onChange={(sourceCaption) => onChange({ ...question, sourceCaption })}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 font-medium text-soft-foreground">{t("source.parts")}</p>
        <ol className="space-y-3">
          {parts.map((part, index) => (
            <li key={part.id} className="rounded-xl border bg-card p-3" data-source-part="">
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 font-semibold text-soft-foreground">{optionLabel(index, labelStyle)})</span>
                <RichTextInput
                  singleLine
                  className="min-w-0 flex-1"
                  value={part.text}
                  ariaLabel={t("source.part", { label: optionLabel(index, labelStyle) })}
                  placeholder={t("source.partPlaceholder")}
                  onChange={(text) => setPart(part.id, { text })}
                />
                <RowControls
                  index={index}
                  count={parts.length}
                  min={LIMITS.sourceParts.min}
                  onMove={(by) => onChange({ ...question, parts: move(parts, index, by) })}
                  onRemove={() => onChange({ ...question, parts: parts.filter((p) => p.id !== part.id) })}
                />
              </div>
              <div className="mt-3 ml-8 flex flex-wrap items-start gap-x-6 gap-y-3">
                <LinesStepper id={part.id} value={part.lines} min={0} onChange={(lines) => setPart(part.id, { lines })} />
                <div className="min-w-48 flex-1">
                  <FieldLabel hint={t("sa.answerHint")}>{t("sa.answer")}</FieldLabel>
                  <RichTextInput
                    singleLine
                    value={part.answer}
                    ariaLabel={t("sa.answer")}
                    placeholder={t("sa.answerPlaceholder")}
                    onChange={(answer) => setPart(part.id, { answer })}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className={`${addButtonClass} mt-1`}
          disabled={parts.length >= LIMITS.sourceParts.max}
          onClick={() => onChange({ ...question, parts: [...parts, { id: newId(), text: [], lines: 3, answer: [] }] })}
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("source.addPart")}
        </button>
      </div>
    </div>
  );
}
