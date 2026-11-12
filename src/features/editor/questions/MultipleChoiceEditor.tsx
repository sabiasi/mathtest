"use client";

import { CircleAlert, Plus, X } from "lucide-react";
import { inputClasses } from "@/components/ui/form";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { MAX_OPTIONS, MIN_OPTIONS, optionLabel } from "@/lib/questions";
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

  function setOptionText(id: string, text: string) {
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
                className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-semibold transition-colors ${
                  isCorrect
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300 text-slate-600 hover:border-emerald-500 hover:text-emerald-700"
                }`}
              >
                {label}
              </button>
              <div className="relative min-w-0 flex-1">
                <input
                  className={`${inputClasses} ${isCorrect ? "border-emerald-500 bg-emerald-50/60 pr-20" : ""}`}
                  value={option.text}
                  placeholder={t("mc.optionPlaceholder", { label })}
                  onChange={(e) => setOptionText(option.id, e.target.value)}
                />
                {isCorrect && (
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-emerald-700">
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
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:invisible"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pl-11">
        {correctOptionId === null ? (
          <p className="flex items-center gap-1.5 text-sm text-amber-700">
            <CircleAlert className="size-4" aria-hidden="true" />
            {t("mc.noCorrect")} {t("mc.hint")}
          </p>
        ) : (
          <p className="text-sm text-slate-500">{t("mc.hint")}</p>
        )}
        {options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={() => onChange({ ...question, options: [...options, { id: newId(), text: "" }] })}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("mc.addOption")}
          </button>
        )}
      </div>
    </div>
  );
}
