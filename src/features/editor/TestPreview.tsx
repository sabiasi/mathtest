"use client";

import { RichTextView } from "@/features/math/RichTextView";
import { useLanguage, useT } from "@/i18n/language";
import { formatDate } from "@/lib/format";
import { formatPoints, optionLabel, totalPoints } from "@/lib/questions";
import { isRichTextEmpty } from "@/lib/richText";
import type { Question, Test } from "@/lib/storage/types";

/**
 * A read-only view of the test as students will see it, with formulas
 * drawn as static math. (The exact A4 print layout comes in Phase 4.)
 */
export function TestPreview({ test }: { test: Test }) {
  const t = useT();
  const language = useLanguage();
  const date = formatDate(test.date, language);

  return (
    <div>
      <p className="mb-4 text-center text-sm text-slate-500">{t("preview.note")}</p>
      <article className="rounded-sm bg-white px-6 py-8 text-[15px] leading-relaxed text-slate-900 shadow-md ring-1 ring-slate-200 sm:px-12 sm:py-12">
        {test.schoolName && <p className="text-center text-sm text-slate-600">{test.schoolName}</p>}
        <h1 className="mt-1 text-center text-xl font-bold">{test.title || t("test.untitled")}</h1>
        <p className="mt-1 text-center text-sm text-slate-600">
          {[test.subject, test.grade, date, test.timeLimitMinutes && t("preview.time", { minutes: test.timeLimitMinutes })]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-y border-slate-300 py-3 text-sm">
          <span className="flex-1">
            {t("preview.student")}: <span className="inline-block w-48 border-b border-slate-400" />
          </span>
          <span>
            {t("preview.class")}: <span className="inline-block w-16 border-b border-slate-400" />
          </span>
          <span className="font-semibold">{t("preview.total", { points: formatPoints(totalPoints(test.questions)) })}</span>
        </div>

        {test.instructions && <p className="mt-4 text-sm whitespace-pre-wrap text-slate-700 italic">{test.instructions}</p>}

        {test.questions.length === 0 ? (
          <p className="mt-8 text-center text-slate-500">{t("preview.empty")}</p>
        ) : (
          <ol className="mt-6 space-y-6">
            {test.questions.map((question, index) => (
              <li key={question.id} className="flex gap-3">
                <span className="font-bold">{index + 1}.</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <RichTextView value={question.text} className="flex-1" />
                    <span className="shrink-0 text-sm text-slate-500">
                      ({t("preview.points", { points: formatPoints(question.points) })})
                    </span>
                  </div>
                  <QuestionBody question={question} labelStyle={test.labelStyle} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </article>
    </div>
  );
}

function QuestionBody({ question, labelStyle }: { question: Question; labelStyle: Test["labelStyle"] }) {
  const t = useT();
  switch (question.type) {
    case "multiple-choice":
      return (
        <ul className="mt-2 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
          {question.options
            .filter((option) => !isRichTextEmpty(option.text))
            .map((option) => (
              <li key={option.id} className="flex gap-2">
                <span className="font-semibold">{optionLabel(question.options.indexOf(option), labelStyle)})</span>
                <RichTextView value={option.text} />
              </li>
            ))}
        </ul>
      );
    case "true-false":
      return (
        <p className="mt-2 flex gap-6 text-sm">
          <span>○ {t("tf.true")}</span>
          <span>○ {t("tf.false")}</span>
        </p>
      );
    case "short-answer":
      return (
        <p className="mt-3 text-sm">
          {t("preview.answer")}: <span className="inline-block w-56 border-b border-slate-400" />
        </p>
      );
    case "open-answer":
      return (
        <div className="mt-2">
          {Array.from({ length: question.lines }, (_, i) => (
            <div key={i} className="h-8 border-b border-slate-300" />
          ))}
        </div>
      );
  }
}
