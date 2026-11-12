"use client";

import { Field, inputClasses } from "@/components/ui/form";
import { useT } from "@/i18n/language";
import type { ShortAnswerQuestion } from "@/lib/storage/types";

export function ShortAnswerEditor({
  question,
  onChange,
}: {
  question: ShortAnswerQuestion;
  onChange: (question: ShortAnswerQuestion) => void;
}) {
  const t = useT();
  return (
    <Field label={t("sa.answer")} hint={t("sa.answerHint")} className="max-w-md">
      <input
        className={inputClasses}
        value={question.answer}
        placeholder={t("sa.answerPlaceholder")}
        onChange={(e) => onChange({ ...question, answer: e.target.value })}
      />
    </Field>
  );
}
