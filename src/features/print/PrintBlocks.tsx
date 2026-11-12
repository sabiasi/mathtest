"use client";

/**
 * The pieces of a printed exam: the header (school, title, student fields)
 * and one block per question. They are drawn twice: once invisibly to
 * measure their height, and once on the real A4 sheets.
 */
import { RichTextView } from "@/features/math/RichTextView";
import { useLanguage, useT } from "@/i18n/language";
import { formatDate } from "@/lib/format";
import { formatPoints, optionLabel, totalPoints } from "@/lib/questions";
import { isRichTextEmpty } from "@/lib/richText";
import type { MultipleChoiceQuestion, Question, Test } from "@/lib/storage/types";

export type PrintVersion = "student" | "key";

/** A blank line to write on, e.g. after "Student name:". */
function Blank({ width }: { width: string }) {
  return <span className="inline-block border-b border-black align-baseline" style={{ width }} />;
}

export function PrintHeader({ test, version }: { test: Test; version: PrintVersion }) {
  const t = useT();
  const language = useLanguage();
  const total = formatPoints(totalPoints(test.questions));
  const meta = [
    test.subject,
    test.grade,
    formatDate(test.date, language),
    test.timeLimitMinutes ? t("print.time", { minutes: test.timeLimitMinutes }) : "",
  ].filter(Boolean);

  return (
    <header className="print-header">
      {version === "key" && <p className="print-key-banner">{t("print.keyBanner")}</p>}
      {test.schoolName && <p className="print-school">{test.schoolName}</p>}
      <h1 className="print-title">{test.title || t("test.untitled")}</h1>
      {meta.length > 0 && <p className="print-meta">{meta.join("  ·  ")}</p>}

      <div className="print-fields">
        {version === "student" ? (
          <>
            <span className="flex-1">
              {t("print.studentName")}: <Blank width="55%" />
            </span>
            <span>
              {t("print.class")}: <Blank width="14mm" />
            </span>
            <span>
              {t("print.score")}: <Blank width="10mm" /> / {total}
            </span>
          </>
        ) : (
          <span className="font-semibold">{t("print.total", { points: total })}</span>
        )}
      </div>

      {test.instructions && <p className="print-instructions">{test.instructions}</p>}
    </header>
  );
}

/** How many columns multiple-choice options use: decided by measuring them. */
export type OptionColumns = Record<string, 1 | 2 | 3 | 4>;

export function PrintQuestion({
  question,
  number,
  test,
  version,
  optionColumns,
}: {
  question: Question;
  number: number;
  test: Test;
  version: PrintVersion;
  optionColumns: OptionColumns;
}) {
  const t = useT();
  const points = formatPoints(question.points);
  const pointsText = t(question.points === 1 ? "print.pointsOne" : "print.pointsMany", { points });

  return (
    <div className="print-question">
      <div className="flex items-start gap-[2mm]">
        <span className="print-number">{number}.</span>
        <div className="min-w-0 flex-1">
          <RichTextView value={question.text} />
        </div>
        {test.printOptions.showPoints && <span className="print-points">({pointsText})</span>}
      </div>
      <div className="print-body">
        <QuestionBody question={question} test={test} version={version} optionColumns={optionColumns} />
      </div>
    </div>
  );
}

function QuestionBody({
  question,
  test,
  version,
  optionColumns,
}: {
  question: Question;
  test: Test;
  version: PrintVersion;
  optionColumns: OptionColumns;
}) {
  const t = useT();
  const key = version === "key";

  switch (question.type) {
    case "multiple-choice":
      return (
        <ul className="print-options" style={{ gridTemplateColumns: `repeat(${optionColumns[question.id] ?? 1}, minmax(0, 1fr))` }}>
          {visibleOptions(question).map((option, index) => {
            const correct = key && option.id === question.correctOptionId;
            return (
              <li key={option.id} className={`print-option ${correct ? "is-correct" : ""}`}>
                <span className="print-option-label">{optionLabel(index, test.labelStyle)})</span>
                <RichTextView value={option.text} />
              </li>
            );
          })}
        </ul>
      );

    case "true-false":
      return (
        <div className="flex gap-[10mm]">
          {[true, false].map((value) => (
            <span key={String(value)} className={`print-choice ${key && question.correct === value ? "is-correct" : ""}`}>
              <span className="print-circle" />
              {t(value ? "tf.true" : "tf.false")}
            </span>
          ))}
        </div>
      );

    case "short-answer":
      return (
        <div className="flex items-end gap-[2mm]">
          <span>{t("print.answer")}</span>
          <span className="print-answer-line">
            {key && !isRichTextEmpty(question.answer) && (
              <span className="print-key-answer">
                <RichTextView value={question.answer} />
              </span>
            )}
          </span>
        </div>
      );

    case "open-answer":
      return (
        <div>
          {Array.from({ length: question.lines }, (_, i) => (
            <div key={i} className="print-line" />
          ))}
        </div>
      );
  }
}

/** Options the teacher left empty are not printed (and don't use up a letter). */
export function visibleOptions(question: MultipleChoiceQuestion) {
  return question.options.filter((option) => !isRichTextEmpty(option.text));
}
