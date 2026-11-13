"use client";

import { CircleAlert, Plus, X } from "lucide-react";
import { RichTextInput } from "@/features/math/RichTextInput";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { cn } from "@/lib/utils";
import { MAX_OPTIONS, MIN_OPTIONS, optionLabel } from "@/lib/questions";
import type { RichText } from "@/lib/richText";
import type { LabelStyle, MultipleChoiceQuestion } from "@/lib/storage/types";

export function MultipleChoiceEditor({
  question,
  labelStyle,
  onChange,
}: {
  question: MultipleChoiceQuestion;
  labelStyle: LabelStyle;
  onChange: (question: MultipleChoiceQuestion) => void;
}) {
  const t = useT();
  const { options, correctOptionId } = question;

  function setOptionText(id: string, text: RichText) {
    onChange({ ...question, options: options.map((o) => (o.id === id ? { ...o, text } : o)) });
  }

  function removeOption(id: string) {
    onChange({
      ...question,
      options: options.filter((o) => o.id !== id),
      correctOptionId: correctOptionId === id ? null : correctOptionId,
    });
  }

  return (
    <div>
      <ul className="space-y-2">
        {options.map((option, index) => {
          const label = optionLabel(index, labelStyle);
          const isCorrect = option.id === correctOptionId;
          return (
            <li key={option.id} className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={isCorrect}
                aria-label={t("mc.markCorrect", { label })}
                title={t("mc.markCorrect", { label })}
                onClick={() => onChange({ ...question, correctOptionId: isCorrect ? null : option.id })}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-semibold transition-[color,background-color,border-color,transform] duration-150 motion-safe:active:scale-90 pointer-coarse:size-11",
                  isCorrect
                    ? "border-success bg-success text-white"
                    : "border-input text-muted-foreground hover:border-success-border hover:text-success-text",
                )}
              >
                {label}
              </button>
              <div className="relative min-w-0 flex-1">
                <RichTextInput
                  singleLine
                  value={option.text}
                  ariaLabel={t("mc.optionAria", { label })}
                  placeholder={t("mc.optionPlaceholder", { label })}
                  onChange={(text) => setOptionText(option.id, text)}
                  className={isCorrect ? "border-success-border! bg-success-soft! pr-20" : ""}
                />
                {isCorrect && (
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-success-text">
                    ✓ {t("mc.correct")}
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={options.length <= MIN_OPTIONS}
                onClick={() => removeOption(option.id)}
                aria-label={t("mc.removeOption", { label })}
                title={t("mc.removeOption", { label })}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:invisible pointer-coarse:p-3"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pl-11">
        {correctOptionId === null ? (
          <p className="flex items-center gap-1.5 text-sm text-warning-text">
            <CircleAlert className="size-4" aria-hidden="true" />
            {t("mc.noCorrect")} {t("mc.hint")}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("mc.hint")}</p>
        )}
        <label className="order-last flex w-full cursor-pointer flex-wrap items-center gap-x-2 text-sm text-soft-foreground">
          <input
            type="checkbox"
            checked={question.lockOptions}
            onChange={(e) => onChange({ ...question, lockOptions: e.target.checked })}
            className="size-4 accent-primary"
          />
          {t("variants.lockOptions")}
          <span className="text-muted-foreground">({t("variants.lockHint")})</span>
        </label>
        {options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={() => onChange({ ...question, options: [...options, { id: newId(), text: [] }] })}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-primary-soft"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("mc.addOption")}
          </button>
        )}
      </div>
    </div>
  );
}
