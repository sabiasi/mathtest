"use client";

import { FieldLabel } from "@/components/ui/form";
import { RichTextInput } from "@/features/math/RichTextInput";
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
    // A <div> rather than a <label>: clicking a label would steal focus from the formula boxes.
    <div className="max-w-md">
      <FieldLabel hint={t("sa.answerHint")}>{t("sa.answer")}</FieldLabel>
      <RichTextInput
        singleLine
        value={question.answer}
        ariaLabel={t("sa.answer")}
        placeholder={t("sa.answerPlaceholder")}
        onChange={(answer) => onChange({ ...question, answer })}
      />
    </div>
  );
}
