"use client";

/**
 * The pieces of a printed exam: the header (school, title, student fields)
 * and one block per question. They are drawn twice: once invisibly to
 * measure their height, and once on the real A4 sheets.
 */
import { useImageUrl } from "@/components/QuestionImageView";
import { logoSizeMm, type PaperHeader } from "@/lib/paperHeader";
import { usePaperHeader } from "./usePaperHeader";
import { GridArea } from "@/components/GridArea";
import { QuestionImageView } from "@/components/QuestionImageView";
import { RichTextView } from "@/features/math/RichTextView";
import { useLanguage, useT } from "@/i18n/language";
import { formatDate } from "@/lib/format";
import { formatPoints, optionLabel, totalPoints, visibleOptions } from "@/lib/questions";
import { isRichTextEmpty, type RichText } from "@/lib/richText";
import type { Question, Test } from "@/lib/storage/types";
import { MapPrint, OrderPrint, SourcePrint, TimelinePrint } from "@/subjects/history/HistoryPrint";
import { GivenFindPrint } from "@/subjects/physics/GivenFindPrint";
import { EssayPrint, FindMistakePrint, GrammarTablePrint, MarkWordsPrint, SentenceAnalysisPrint } from "@/subjects/georgian/GeorgianPrint";
import { BalancePrint } from "@/subjects/chemistry/BalancePrint";
import { LabelDiagramPrint } from "@/subjects/biology/LabelDiagramView";
import { PedigreePrint, PunnettPrint } from "@/subjects/biology/GeneticsPrint";
import { CodonTablePrint, SequencePrint } from "@/subjects/biology/MolecularPrint";
import { FoodWebPrint, PyramidPrint } from "@/subjects/biology/EcologyPrint";
import { ClimateChartPrint, ScaleCalcPrint } from "@/subjects/geography/GeographyPrint";
import { KeyPrint, TaxonomyPrint } from "@/subjects/biology/ClassificationPrint";
import { FillBlankPrint } from "./FillBlankPrint";
import {
  CrosswordPrint,
  GeorgianInstruction,
  OddOneOutPrint,
  PictureMatchPrint,
  TransformationPrint,
  WordFormationPrint,
  WordSearchPrint,
} from "@/subjects/english/EnglishPrint";
import { MatchingPrint } from "./MatchingPrint";
import { useTypography } from "./Typography";
import { openAnswerSpace } from "@/subjects/registry";

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
  // The teacher's own header (Premium), or null for the plain school line.
  const letterhead = usePaperHeader();
  const meta = [
    test.subject,
    test.level && t("print.level", { level: test.level }),
    test.grade,
    formatDate(test.date, language),
    test.timeLimitMinutes ? t("print.time", { minutes: test.timeLimitMinutes }) : "",
  ].filter(Boolean);

  return (
    <header className={`print-header ${variant ? "has-variant" : ""}`}>
      {variant && <p className="print-variant-badge">{t("variants.name", { label: variant })}</p>}
      {version === "key" && <p className="print-key-banner">{t("print.keyBanner")}</p>}
      {letterhead ? <Letterhead header={letterhead} fallbackSchool={test.schoolName} /> : test.schoolName && <p className="print-school">{test.schoolName}</p>}
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

      {!isRichTextEmpty(test.instructions) && (
        <p className="print-instructions">
          <RichTextView value={test.instructions} />
        </p>
      )}
    </header>
  );
}

/** The teacher's own header: logo beside (or above) the school name and extra lines. */
export function Letterhead({ header, fallbackSchool }: { header: PaperHeader; fallbackSchool: string }) {
  const logo = useImageUrl(header.logoImageId);
  const size = logoSizeMm(header);
  const school = header.schoolName || fallbackSchool;
  return (
    <div className={`print-letterhead logo-${header.logoPosition}`} data-letterhead={header.logoPosition}>
      {header.logoImageId &&
        (logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a stored picture (blob:/data: URL), not a site asset
          <img src={logo} alt="" className="print-logo" style={{ width: `${size.width}mm`, height: `${size.height}mm` }} draggable={false} />
        ) : (
          <span className="print-logo" style={{ width: `${size.width}mm`, height: `${size.height}mm` }} aria-hidden="true" />
        ))}
      <div className="print-letterhead-text">
        {school && <p className="print-school">{school}</p>}
        {header.extraLines.map((line, index) => (
          <p key={index} className="print-header-line">{line}</p>
        ))}
      </div>
    </div>
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
              <GeorgianInstruction text={question.instructionKa} show={test.printOptions.bilingual} />
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

    case "true-false": {
      const choices: (boolean | "not-given")[] = question.notGiven ? [true, false, "not-given"] : [true, false];
      const label = (value: boolean | "not-given") => t(value === "not-given" ? "tf.notGiven" : value ? "tf.true" : "tf.false");
      return (
        <div className="flex flex-wrap gap-x-[10mm] gap-y-[1mm]">
          {choices.map((value) => (
            <span key={String(value)} className={`print-choice ${key && question.correct === value ? "is-correct" : ""}`}>
              <span className="print-circle" />
              {label(value)}
            </span>
          ))}
        </div>
      );
    }

    case "short-answer":
      return <AnswerLine label={t("print.answer")} answer={key ? question.answer : undefined} />;

    case "open-answer": {
      const space = openAnswerSpace(question, test.subjectId);
      const answer = key && question.answer && !isRichTextEmpty(question.answer) ? question.answer : undefined;
      // "One line": exactly like a short answer — "Answer: ______".
      if (space === "short") return <AnswerLine label={t("print.answer")} answer={answer} />;
      return (
        <div>
          {/* "Blank": the same height, without ruled lines — room for a worked solution. */}
          {Array.from({ length: question.lines }, (_, i) => (
            <div key={i} className={space === "blank" ? "print-line print-line-blank" : "print-line"} />
          ))}
          {/* The key adds the final answer under the room for working. */}
          {answer && (
            <div className="mt-[2mm]">
              <AnswerLine label={t("print.answer")} answer={answer} />
            </div>
          )}
        </div>
      );
    }

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

    case "label-diagram":
      return <LabelDiagramPrint question={question} labelStyle={test.labelStyle} answerKey={key} />;

    case "punnett":
      return <PunnettPrint question={question} answerKey={key} />;

    case "pedigree":
      return <PedigreePrint question={question} answerKey={key} />;

    case "sequence":
      return <SequencePrint question={question} answerKey={key} columns={test.printOptions.columns} />;

    case "codon-table":
      return <CodonTablePrint question={question} />;

    case "food-web":
      return <FoodWebPrint question={question} answerKey={key} />;

    case "pyramid":
      return <PyramidPrint question={question} answerKey={key} />;

    case "dichotomous-key":
      return <KeyPrint question={question} answerKey={key} />;

    case "taxonomy":
      return <TaxonomyPrint question={question} answerKey={key} />;

    case "scale-calc":
      return <ScaleCalcPrint question={question} answerKey={key} />;

    case "climate-chart":
      return <ClimateChartPrint question={question} labelStyle={test.labelStyle} answerKey={key} />;

    case "fill-blank":
      return <FillBlankPrint question={question} labelStyle={test.labelStyle} answerKey={key} />;

    case "transformation":
      return <TransformationPrint question={question} answerKey={key} />;

    case "word-formation":
      return <WordFormationPrint question={question} answerKey={key} />;

    case "picture-match":
      return <PictureMatchPrint question={question} answerKey={key} />;

    case "odd-one-out":
      return <OddOneOutPrint question={question} answerKey={key} />;

    case "crossword":
      return <CrosswordPrint question={question} answerKey={key} />;

    case "word-search":
      return <WordSearchPrint question={question} answerKey={key} />;

    case "mark-words":
      return <MarkWordsPrint question={question} answerKey={key} />;

    case "grammar-table":
      return <GrammarTablePrint question={question} answerKey={key} />;

    case "find-mistake":
      return <FindMistakePrint question={question} labelStyle={test.labelStyle} answerKey={key} />;

    case "sentence-analysis":
      return <SentenceAnalysisPrint question={question} answerKey={key} />;

    case "essay":
      return <EssayPrint question={question} />;

    case "balance":
      return <BalancePrint question={question} answerKey={key} />;

    // Reading texts and poems are drawn piece by piece (see pieces.tsx), never here.
    case "passage":
    case "poem":
    case "section":
    case "listening":
    case "speaking":
      return null;
  }
}

/** "Answer: ______" — on the key with the answer written on the line. */
function AnswerLine({ label, answer }: { label: string; answer?: RichText }) {
  return (
    <div className="print-short-area">
      <div className="print-short flex items-end gap-[2mm]">
        <span>{label}</span>
        <span className="print-answer-line">
          {answer && !isRichTextEmpty(answer) && (
            <span className="print-key-answer">
              <RichTextView value={answer} />
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
