"use client";

/**
 * One table with the correct answers of every variant, printed before the
 * answer keys when "all variants" are shown. Rows = question number on the
 * paper, columns = variants. Checking a pile of mixed papers is much faster
 * with it.
 *
 * Long tables continue on more pages; rows are measured and packed with the
 * same `paginate` function the questions use, so a row is never cut in half.
 */
import { useEffect, useRef, useState } from "react";
import { RichTextView } from "@/features/math/RichTextView";
import { useLanguage, useT } from "@/i18n/language";
import { paginate, type Page } from "@/lib/paginate";
import { correctOptionLabel, isTextBlock } from "@/lib/questions";
import { isRichTextEmpty } from "@/lib/richText";
import type { Question, Test } from "@/lib/storage/types";
import type { Variant } from "@/lib/variants";
import { orderAnswer } from "@/subjects/history/HistoryPrint";
import { balanceAnswer } from "@/subjects/chemistry/BalancePrint";
import { labelDiagramAnswer } from "@/subjects/biology/LabelDiagramView";
import { pedigreeAnswer, punnettAnswer } from "@/subjects/biology/GeneticsPrint";
import { sequenceAnswer } from "@/subjects/biology/MolecularPrint";
import { foodWebAnswer, pyramidAnswer } from "@/subjects/biology/EcologyPrint";
import { keyAnswer, taxonomyAnswer } from "@/subjects/biology/ClassificationPrint";
import { ClimateAnswer, ScaleCalcAnswer } from "@/subjects/geography/GeographyPrint";
import { fillBlankAnswers, fillBlankChoiceAnswers } from "./FillBlankPrint";
import { matchingAnswers } from "./MatchingPrint";
import { CONTENT_HEIGHT, CONTENT_WIDTH, PAGE, mmToPx } from "./usePrintLayout";

const TITLE_GAP = 4; // mm between the title and the table

function Cell({ question, labelStyle }: { question: Question; labelStyle: Test["labelStyle"] }) {
  const t = useT();
  switch (question.type) {
    case "multiple-choice":
      return <>{correctOptionLabel(question, labelStyle) ?? "—"}</>;
    case "true-false":
      return <>{question.correct === null ? "—" : t(question.correct === "not-given" ? "tf.notGiven" : question.correct ? "tf.true" : "tf.false")}</>;
    case "short-answer":
      return isRichTextEmpty(question.answer) ? <>—</> : <RichTextView value={question.answer} />;
    case "open-answer":
      // The teacher's answer when there is one; "one line" without one is a missing answer.
      if (question.answer && !isRichTextEmpty(question.answer)) return <RichTextView value={question.answer} />;
      return question.answerSpace === "short" ? <>—</> : <span className="is-open">{t("variants.open")}</span>;
    case "matching":
      return <>{matchingAnswers(question, labelStyle).map((letter, i) => `${i + 1}${letter}`).join(" ")}</>;
    case "order":
      return <>{orderAnswer(question, labelStyle).join(" ")}</>;
    case "balance":
      return <>{question.equations.filter((e) => e.balanced.trim()).map((e) => balanceAnswer(e.balanced)).join(" | ") || "—"}</>;
    case "fill-blank":
      return (
        <>
          {(question.mode === "choice" ? fillBlankChoiceAnswers(question, labelStyle).map((l, i) => `${i + 1}${l}`).join(" ") : fillBlankAnswers(question).join(", ")) ||
            "—"}
        </>
      );
    case "transformation":
      return <>{question.items.map((i) => i.answer).filter(Boolean).join("; ") || "—"}</>;
    case "word-formation":
      return <>{question.items.map((i) => i.gap?.word).filter(Boolean).join(", ") || "—"}</>;
    case "picture-match":
      return <>{question.pictures.map((p, i) => `${i + 1} ${p.answer}`).join(", ") || "—"}</>;
    case "label-diagram":
      return <>{labelDiagramAnswer(question, labelStyle) || "—"}</>;
    case "punnett":
      return <>{punnettAnswer(question) || "—"}</>;
    case "sequence":
      return <>{sequenceAnswer(question) || "—"}</>;
    case "food-web":
      return <>{foodWebAnswer(question) || "—"}</>;
    case "pyramid":
      return <>{pyramidAnswer(question) || "—"}</>;
    case "dichotomous-key":
      return <>{keyAnswer(question) || "—"}</>;
    case "taxonomy":
      return <>{taxonomyAnswer(question) || "—"}</>;
    case "scale-calc":
      return <ScaleCalcAnswer question={question} />;
    case "climate-chart":
      return <ClimateAnswer question={question} labelStyle={labelStyle} />;
    case "codon-table":
      return <span className="is-open">{t("variants.open")}</span>;
    case "pedigree":
      return pedigreeAnswer(question) ? <>{pedigreeAnswer(question)}</> : <span className="is-open">{t("variants.open")}</span>;
    case "odd-one-out":
      return <>{question.rows.map((r) => (r.odd === null ? "?" : r.words[r.odd])).join(", ") || "—"}</>;
    case "mark-words":
      return <>{question.marked.map((m) => m.word).join(", ") || "—"}</>;
    case "find-mistake":
      return <>{question.items.map((item) => item.correction).filter(Boolean).join(", ") || "—"}</>;
    case "timeline":
    case "source":
    case "map":
    case "crossword":
    case "word-search":
    case "section":
    case "listening":
    case "speaking":
    case "grammar-table":
    case "sentence-analysis":
    case "essay":
    case "passage":
    case "poem":
      return <span className="is-open">{t("variants.open")}</span>;
    case "given-find":
      return isRichTextEmpty(question.answer) ? <span className="is-open">{t("variants.open")}</span> : <RichTextView value={question.answer} />;
  }
}

export function AnswerTable({
  variants,
  test,
  blankAfter,
  onReady,
}: {
  variants: Variant[];
  test: Test;
  /** Add a blank page if the table has an odd number of pages (double-sided printing). */
  blankAfter: boolean;
  onReady: (ready: boolean) => void;
}) {
  const t = useT();
  const language = useLanguage();
  const rowCount = test.questions.length;
  const fontSize = test.printOptions.fontSize;
  const signature = JSON.stringify([variants.map((v) => v.test.questions), test.labelStyle, fontSize, language]);

  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<{ signature: string; value: Page[] } | null>(null);
  const ready = pages?.signature === signature;

  useEffect(() => {
    onReady(ready);
  }, [ready, onReady]);
  useEffect(() => () => onReady(false), [onReady]);

  useEffect(() => {
    if (pages?.signature === signature) return;
    let alive = true;
    void measureRef.current?.offsetWidth;
    document.fonts.ready.then(() => {
      const root = measureRef.current;
      if (!alive || !root) return;
      const title = root.querySelector("h2")!.getBoundingClientRect().height + mmToPx(TITLE_GAP);
      const head = root.querySelector("thead")!.getBoundingClientRect().height;
      const rows = [...root.querySelectorAll<HTMLElement>("tbody tr")].map((row) => ({
        // The question's position in the test (texts are skipped, so not simply 0, 1, 2…).
        key: row.dataset.row!,
        height: row.getBoundingClientRect().height,
      }));
      const value = paginate({
        blocks: rows,
        columnHeight: mmToPx(CONTENT_HEIGHT) - title - head - 2,
        columns: 1,
        gap: 0,
        firstPageTop: 0,
      });
      setPages({ signature, value });
    });
    return () => {
      alive = false;
    };
  }, [signature, pages?.signature]);

  const table = (rowIndexes: number[]) => (
    <table className="answer-table">
      <thead>
        <tr>
          <th>{t("variants.tableQuestion")}</th>
          {variants.map((v) => (
            <th key={v.label}>{t("variants.name", { label: v.label })}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowIndexes.map((i) => (
          <tr key={i} data-row={i}>
            <td>{rowNumber(i)}</td>
            {variants.map((v) => (
              <td key={v.label}>
                <Cell question={v.test.questions[i]} labelStyle={test.labelStyle} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const title = <h2 className="text-center text-[1.2em] font-bold">{t("variants.tableTitle")}</h2>;
  // Reading texts and poems aren't questions: no row. (They stay in the same
  // place in every variant, so the same positions are skipped everywhere.)
  const allRows = Array.from({ length: rowCount }, (_, i) => i).filter((i) => !isTextBlock(test.questions[i]));
  const rowNumber = (i: number) => allRows.indexOf(i) + 1;
  const shown = pages?.value ?? [];

  return (
    <>
      {/* Invisible copy for measuring row heights. */}
      <div aria-hidden="true" className={`sheet-font-${fontSize}`}>
        <div ref={measureRef} className="pointer-events-none invisible absolute top-0 -left-[10000px]" style={{ width: `${CONTENT_WIDTH}mm` }}>
          {title}
          <div style={{ marginTop: `${TITLE_GAP}mm` }}>{table(allRows)}</div>
        </div>
      </div>

      {shown.map((page, pageIndex) => (
        <section key={pageIndex} className={`sheet sheet-font-${fontSize}`}>
          {title}
          <div style={{ marginTop: `${TITLE_GAP}mm` }}>{table(page.columns[0].map(Number))}</div>
          <footer className="sheet-footer" style={{ bottom: `${PAGE.padBottom / 2 - 2}mm` }}>
            <span>
              {test.title || t("test.untitled")} — {t("variants.tableTitle")}
            </span>
            <span>{t("print.page", { page: pageIndex + 1, pages: shown.length })}</span>
          </footer>
        </section>
      ))}
      {blankAfter && shown.length % 2 === 1 && <section className="sheet" aria-hidden="true" />}
    </>
  );
}
