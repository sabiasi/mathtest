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
  const value = question.correct === null ? null : question.correct === "not-given" ? "not-given" : question.correct ? "true" : "false";
  const parse = (v: string): TrueFalseQuestion["correct"] => (v === "not-given" ? "not-given" : v === "true");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-soft-foreground">{t("tf.correctAnswer")}</span>
      <SegmentedControl
        label={t("tf.correctAnswer")}
        value={value}
        // Clicking the selected answer again clears it.
        onChange={(v) => onChange({ ...question, correct: v === value ? null : parse(v) })}
        options={[
          { value: "true", label: t("tf.true"), activeClass: "bg-success" },
          { value: "false", label: t("tf.false"), activeClass: "bg-destructive" },
          ...(question.notGiven ? [{ value: "not-given", label: t("tf.notGiven") }] : []),
        ]}
      />
      {/* English reading tasks: True / False / Not Given */}
      <label className="flex items-center gap-2 text-sm text-soft-foreground">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={question.notGiven === true}
          onChange={(e) =>
            onChange({ ...question, notGiven: e.target.checked, correct: !e.target.checked && question.correct === "not-given" ? null : question.correct })
          }
        />
        {t("tf.offerNotGiven")}
      </label>
    </div>
  );
}
