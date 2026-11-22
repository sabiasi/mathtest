"use client";

/**
 * One table with the correct answers of every variant, printed before the
 * answer keys when "all variants" are shown. Rows = question number on the
 * paper, columns = variants. Checking a pile of mixed papers is much faster
 * with it.
 *
 * Long tables continue on more pages; rows are measured and packed with the
 * same `paginate` function the questions use, so a row is never cut in half.
 *
 * The table is never wider than the page. Text wraps inside its cell and a
 * long formula is drawn smaller (RichTextView), but never below
 * SMALLEST_FORMULA. When the widest formula still can't fit in a variant
 * column (e.g. 6 variants with long formula answers), the variants are split
 * into groups — e.g. one table for A–C, then one for D–F — so every column
 * is wide enough.
 */
import { useEffect, useRef, useState } from "react";
import { RichTextView, SMALLEST_FORMULA } from "@/features/math/RichTextView";
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
const GROUP_GAP = 6; // mm between two tables (groups of variants) on one page
/** Sizes from `.answer-table` in globals.css, in mm. */
const ANSWER_TABLE = { numberColumn: 14, padX: 2, border: 0.3 };

/** Width (mm) left for the answer in a cell when `columns` variants share the table. */
const cellWidth = (columns: number) =>
  (CONTENT_WIDTH - ANSWER_TABLE.numberColumn) / columns - 2 * ANSWER_TABLE.padX - ANSWER_TABLE.border;

/**
 * How many variants go into one table: all of them when the widest formula
 * fits a column (at its smallest allowed size), else fewer. Groups are kept
 * even: 6 variants that don't fit as 6 become 3 + 3, not 4 + 2.
 */
export function variantsPerTable(count: number, widestFormulaMm: number): number {
  const needed = widestFormulaMm * SMALLEST_FORMULA;
  let columns = count;
  while (columns > 1 && cellWidth(columns) < needed) columns--;
  const groups = Math.ceil(count / columns);
  return Math.ceil(count / groups);
}

/** "2:5" = group 2, row of question 5. */
const rowKey = (group: number, row: number) => `${group}:${row}`;
const fromKey = (key: string) => key.split(":").map(Number) as [number, number];

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

  // Fonts (Georgian, math) can finish loading late and change sizes: measure again then.
  const [fontEpoch, setFontEpoch] = useState(0);
  useEffect(() => {
    const bump = () => setFontEpoch((n) => n + 1);
    document.fonts.addEventListener("loadingdone", bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);
  const signature = JSON.stringify([variants.map((v) => v.test.questions), test.labelStyle, fontSize, language, fontEpoch]);

  const probeRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [perTable, setPerTable] = useState<{ signature: string; value: number } | null>(null);
  const [pages, setPages] = useState<{ signature: string; value: Page[]; size: number } | null>(null);
  const ready = pages?.signature === signature;

  useEffect(() => {
    onReady(ready);
  }, [ready, onReady]);
  useEffect(() => () => onReady(false), [onReady]);

  // Step 1: the widest formula → how many variants fit in one table.
  useEffect(() => {
    if (perTable?.signature === signature) return;
    let alive = true;
    void probeRef.current?.offsetWidth;
    document.fonts.ready.then(() => {
      const root = probeRef.current;
      if (!alive || !root) return;
      // Pixels per mm, measured (the sheets may be zoomed on a small screen).
      const pxPerMm = root.getBoundingClientRect().width / CONTENT_WIDTH || mmToPx(1);
      const widest = Math.max(0, ...[...root.querySelectorAll<HTMLElement>(".math-static")].map((f) => f.getBoundingClientRect().width));
      setPerTable({ signature, value: variantsPerTable(variants.length, widest / pxPerMm) });
    });
    return () => {
      alive = false;
    };
  }, [signature, perTable?.signature, variants.length]);

  const size = perTable?.signature === signature ? perTable.value : null;
  const groupsOf = (n: number) => Array.from({ length: Math.ceil(variants.length / n) }, (_, g) => variants.slice(g * n, (g + 1) * n));

  // Step 2: row heights → pages.
  useEffect(() => {
    if (!size || pages?.signature === signature) return;
    let alive = true;
    void measureRef.current?.offsetWidth;
    document.fonts.ready.then(() => {
      const root = measureRef.current;
      if (!alive || !root) return;
      const pxPerMm = root.getBoundingClientRect().width / CONTENT_WIDTH || mmToPx(1);
      const title = root.querySelector("h2")!.getBoundingClientRect().height + TITLE_GAP * pxPerMm;
      const tables = [...root.querySelectorAll<HTMLElement>("table")];
      // Every page starts with the title and a table head (a group continuing from the
      // page before repeats its head); a group starting lower on a page brings its own.
      const head = Math.max(...tables.map((table) => table.querySelector("thead")!.getBoundingClientRect().height));
      const rows = tables.flatMap((table, group) =>
        [...table.querySelectorAll<HTMLElement>("tbody tr")].map((row, index) => ({
          key: row.dataset.row!,
          height: row.getBoundingClientRect().height,
          gap: group > 0 && index === 0 ? GROUP_GAP * pxPerMm + head : 0,
        })),
      );
      const value = paginate({
        blocks: rows,
        columnHeight: CONTENT_HEIGHT * pxPerMm - title - head - 2,
        columns: 1,
        gap: 0,
        firstPageTop: 0,
      });
      setPages({ signature, value, size });
    });
    return () => {
      alive = false;
    };
  }, [signature, size, pages?.signature]);

  const table = (group: number, shownVariants: Variant[], rowIndexes: number[]) => (
    <table className="answer-table">
      <thead>
        <tr>
          <th>{t("variants.tableQuestion")}</th>
          {shownVariants.map((v) => (
            <th key={v.label}>{t("variants.name", { label: v.label })}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowIndexes.map((i) => (
          <tr key={i} data-row={rowKey(group, i)}>
            <td>{rowNumber(i)}</td>
            {shownVariants.map((v) => (
              <td key={v.label}>
                <Cell question={v.test.questions[i]} labelStyle={test.labelStyle} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  /** One page's rows, as one table per group of variants. */
  const pageTables = (keys: string[], groups: Variant[][]) => {
    const runs: { group: number; rows: number[] }[] = [];
    for (const [group, row] of keys.map(fromKey)) {
      const last = runs[runs.length - 1];
      if (last?.group === group) last.rows.push(row);
      else runs.push({ group, rows: [row] });
    }
    return runs.map((run, i) => (
      <div key={run.group} style={{ marginTop: `${i === 0 ? TITLE_GAP : GROUP_GAP}mm` }}>
        {table(run.group, groups[run.group] ?? [], run.rows)}
      </div>
    ));
  };

  const title = <h2 className="text-center text-[1.2em] font-bold">{t("variants.tableTitle")}</h2>;
  // Reading texts and poems aren't questions: no row. (They stay in the same
  // place in every variant, so the same positions are skipped everywhere.)
  const allRows = Array.from({ length: rowCount }, (_, i) => i).filter((i) => !isTextBlock(test.questions[i]));
  const rowNumber = (i: number) => allRows.indexOf(i) + 1;
  // While re-measuring, keep the previous pages (with the groups they were made for).
  const shown = pages?.value ?? [];
  const shownGroups = pages ? groupsOf(pages.size) : [];
  const hidden = "pointer-events-none invisible absolute top-0 -left-[10000px]";

  return (
    <>
      {/* Invisible copies for measuring: every answer at its natural width, then the tables. */}
      <div aria-hidden="true" className={`sheet-font-${fontSize}`}>
        <div ref={probeRef} className={hidden} style={{ width: `${CONTENT_WIDTH}mm` }}>
          {allRows.map((i) =>
            variants.map((v) => (
              <div key={`${v.label}-${i}`} style={{ width: "max-content" }}>
                <Cell question={v.test.questions[i]} labelStyle={test.labelStyle} />
              </div>
            )),
          )}
        </div>
        {size && (
          <div ref={measureRef} className={hidden} style={{ width: `${CONTENT_WIDTH}mm` }}>
            {title}
            {groupsOf(size).map((group, g) => (
              <div key={g} style={{ marginTop: `${TITLE_GAP}mm` }}>
                {table(g, group, allRows)}
              </div>
            ))}
          </div>
        )}
      </div>

      {shown.map((page, pageIndex) => (
        <section key={pageIndex} className={`sheet sheet-font-${fontSize}`}>
          {title}
          {pageTables(page.columns[0], shownGroups)}
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
