"use client";

import { SegmentedControl } from "@/components/ui/form";
import { useT } from "@/i18n/language";
import type { TrueFalseQuestion } from "@/lib/storage/types";

export function TrueFalseEditor({
  question,
  onChange,
}: {
  question: TrueFalseQuestion;
  onChange: (question: TrueFalseQuestion) => void;
}) {
  const t = useT();
  const value = question.correct === null ? null : question.correct ? "true" : "false";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-slate-700">{t("tf.correctAnswer")}</span>
      <SegmentedControl
        label={t("tf.correctAnswer")}
        value={value}
        // Clicking the selected answer again clears it.
        onChange={(v) => onChange({ ...question, correct: v === value ? null : v === "true" })}
        options={[
          { value: "true", label: t("tf.true"), activeClass: "bg-emerald-600 text-white shadow-sm" },
          { value: "false", label: t("tf.false"), activeClass: "bg-rose-600 text-white shadow-sm" },
        ]}
      />
    </div>
  );
}
