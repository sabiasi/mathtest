"use client";

/**
 * The pieces of a printed exam: the header (school, title, student fields)
 * and one block per question. They are drawn twice: once invisibly to
 * measure their height, and once on the real A4 sheets.
 */
import { GridArea } from "@/components/GridArea";
import { QuestionImageView } from "@/components/QuestionImageView";
import { RichTextView } from "@/features/math/RichTextView";
import { useLanguage, useT } from "@/i18n/language";
import { formatDate } from "@/lib/format";
import { formatPoints, optionLabel, totalPoints, visibleOptions } from "@/lib/questions";
import { isRichTextEmpty } from "@/lib/richText";
import type { Question, Test } from "@/lib/storage/types";
import { MapPrint, OrderPrint, SourcePrint, TimelinePrint } from "@/subjects/history/HistoryPrint";
import { GivenFindPrint } from "@/subjects/physics/GivenFindPrint";
import { EssayPrint, FindMistakePrint, GrammarTablePrint, MarkWordsPrint, SentenceAnalysisPrint } from "@/subjects/georgian/GeorgianPrint";
import { FillBlankPrint } from "./FillBlankPrint";
import { MatchingPrint } from "./MatchingPrint";
import { useTypography } from "./Typography";

export type PrintVersion = "student" | "key";

/** A blank line to write on, e.g. after "Student name:". */
function Blank({ width }: { width: string }) {
  return <span className="inline-block border-b border-black align-baseline" style={{ width }} />;
}

export function PrintHeader({
  test,
  version,
  variant,
}: {
  test: Test;
  version: PrintVersion;
  /** "B" when printing variants, null otherwise. */
  variant: string | null;
}) {
  const t = useT();
  const fix = useTypography();
  const language = useLanguage();
  const total = formatPoints(totalPoints(test.questions));
  const meta = [
    test.subject,
    test.grade,
    formatDate(test.date, language),
    test.timeLimitMinutes ? t("print.time", { minutes: test.timeLimitMinutes }) : "",
  ].filter(Boolean);

  return (
    <header className={`print-header ${variant ? "has-variant" : ""}`}>
      {variant && <p className="print-variant-badge">{t("variants.name", { label: variant })}</p>}
      {version === "key" && <p className="print-key-banner">{t("print.keyBanner")}</p>}
      {test.schoolName && <p className="print-school">{test.schoolName}</p>}
      <h1 className="print-title">{fix(test.title) || t("test.untitled")}</h1>
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

      {test.instructions && <p className="print-instructions">{fix(test.instructions)}</p>}
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

  const above = question.images.filter((image) => image.position === "above");
  const right = question.images.filter((image) => image.position === "right");
  const rightWidth = rightColumnPercent(question);

  //  [1.] [ pictures above                              ] [(2 points)]
  //       [ question text, answers, grid  | pictures →  ]
  return (
    <div className="print-question">
      <div className="flex items-start gap-[2mm]">
        <span className="print-number">{number}.</span>
        <div className="min-w-0 flex-1">
          {above.length > 0 && (
            <div className="print-images-above">
              {above.map((image) => (
                <div key={image.id} className="print-image" style={{ width: `${image.widthPercent}%` }}>
                  <QuestionImageView image={image} />
                  {image.caption && <p className="print-caption">{image.caption}</p>}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-start gap-[3mm]">
            <div className="min-w-0 flex-1">
              <RichTextView value={question.text} className="print-text" />
              <div className="print-body">
                <QuestionBody question={question} test={test} version={version} optionColumns={optionColumns} />
              </div>
              {question.grid && (
                <div className="print-grid">
                  <GridArea grid={question.grid} />
                </div>
              )}
            </div>
            {right.length > 0 && (
              <div className="print-images-right" style={{ width: `${rightWidth}%` }}>
                {right.map((image) => (
                  // Sizes are a % of the whole question width; inside this column, relative to the widest.
                  <div key={image.id} style={{ width: `${(image.widthPercent / rightWidth) * 100}%` }}>
                    <QuestionImageView image={image} />
                    {image.caption && <p className="print-caption">{image.caption}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {test.printOptions.showPoints && <span className="print-points">({pointsText})</span>}
      </div>
    </div>
  );
}

/** How wide (in % of the question) the column of pictures on the right is. */
export function rightColumnPercent(question: Question): number {
  return Math.max(0, ...question.images.filter((i) => i.position === "right").map((i) => i.widthPercent));
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

    case "given-find":
      return <GivenFindPrint question={question} answerKey={key} />;

    case "matching":
      return <MatchingPrint question={question} labelStyle={test.labelStyle} answerKey={key} />;

    case "order":
      return <OrderPrint question={question} labelStyle={test.labelStyle} answerKey={key} />;

    case "timeline":
      return <TimelinePrint question={question} answerKey={key} />;

    case "source":
      return <SourcePrint question={question} labelStyle={test.labelStyle} answerKey={key} />;

    case "map":
      return <MapPrint question={question} answerKey={key} />;

    case "fill-blank":
      return <FillBlankPrint question={question} answerKey={key} />;

    case "mark-words":
      return <MarkWordsPrint question={question} answerKey={key} />;

    case "grammar-table":
      return <GrammarTablePrint question={question} answerKey={key} />;

    case "find-mistake":
      return <FindMistakePrint question={question} answerKey={key} />;

    case "sentence-analysis":
      return <SentenceAnalysisPrint question={question} answerKey={key} />;

    case "essay":
      return <EssayPrint question={question} />;

    // Reading texts and poems are drawn piece by piece (see pieces.tsx), never here.
    case "passage":
    case "poem":
      return null;
  }
}
