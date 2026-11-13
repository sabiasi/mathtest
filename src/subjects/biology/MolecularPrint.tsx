"use client";

/**
 * Molecular biology on paper: a DNA / RNA strand with rows to complete
 * (complementary strand, mRNA, amino acids), and the genetic code table.
 * Bases sit in boxes grouped by codon, so they line up like on graph paper.
 */
import { Fragment } from "react";
import { useLanguage, useT } from "@/i18n/language";
import { AMINO_NAMES, BASES_ORDER, aminoAcid, codons, readSequence, sequenceRows, type SequenceRow } from "@/lib/molecular";
import type { CodonTableQuestion, SequenceQuestion } from "@/lib/storage/types";
import "./BiologyPrint.css";

/** The row's caption ("დნმ:", "ი-რნმ:"…). */
function useRowLabel() {
  const t = useT();
  return (row: SequenceRow, givenKind: "dna" | "rna") =>
    row.task === "given" ? t(givenKind === "dna" ? "seq.givenDna" : "seq.givenRna") : t(`seq.row.${row.task}`);
}

/** A sequence question. `columns`: two-column papers fit fewer codons per line. */
export function SequencePrint({ question, answerKey, columns = 1 }: { question: SequenceQuestion; answerKey: boolean; columns?: 1 | 2 }) {
  const t = useT();
  const label = useRowLabel();
  const rows = sequenceRows(question.given, question.tasks, question.strand);
  const read = readSequence(question.given);
  if (!rows || !read.ok) return null;
  const allCodons = codons(rows[0].bases!.join(""));
  const perLine = columns === 2 ? 4 : 8;
  const lines = Array.from({ length: Math.ceil(allCodons.length / perLine) }, (_, i) => i * perLine);

  return (
    <div className={`print-seq ${columns === 2 ? "is-narrow" : ""}`}>
      {lines.map((start) => (
        <div key={start} className="print-seq-block">
          {rows.map((row, r) => {
            const shown = (codonIndex: number) => row.task === "given" || answerKey || (question.example && codonIndex === 0);
            return (
              <div key={r} className="print-seq-row">
                <span className="print-seq-label">{label(row, read.kind)}</span>
                <span className="print-seq-codons">
                  {allCodons.slice(start, start + perLine).map((codon, k) => {
                    const ci = start + k;
                    if (row.amino) {
                      const amino = row.amino[ci];
                      return (
                        <span key={ci} className="print-seq-amino" style={{ width: `${codon.length * 5}mm` }}>
                          {shown(ci) ? (amino === "Stop" ? t("seq.stop") : (amino ?? "—")) : ""}
                        </span>
                      );
                    }
                    const bases = row.bases!.slice(ci * 3, ci * 3 + 3);
                    return (
                      <span key={ci} className={`print-seq-codon ${row.task === "given" ? "is-given" : ""}`}>
                        {bases.map((base, b) => (
                          <span key={b} className="print-seq-base">
                            {shown(ci) ? base : ""}
                          </span>
                        ))}
                      </span>
                    );
                  })}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** For the answer table: "ATG… / AUG… / Met-Ala-…". */
export function sequenceAnswer(question: SequenceQuestion): string {
  const rows = sequenceRows(question.given, question.tasks, question.strand);
  if (!rows) return "";
  return rows
    .slice(1)
    .map((row) => (row.amino ? row.amino.join("-") : codons(row.bases!.join("")).join(" ")))
    .join(" / ");
}

/** The genetic code table: first base (rows) × second base (columns); each cell lists 4 codons. */
export function CodonTablePrint({ question }: { question: CodonTableQuestion }) {
  const t = useT();
  const language = useLanguage();
  const name = (amino: string) => (amino === "Stop" ? t("seq.stop") : amino);
  return (
    <div className="print-codon">
      <p className="print-codon-title">{t("seq.codonTitle")}</p>
      <table className="print-codon-table">
        <thead>
          <tr>
            <th rowSpan={2} className="print-codon-axis">
              {t("seq.firstBase")}
            </th>
            <th colSpan={4} className="print-codon-axis">
              {t("seq.secondBase")}
            </th>
          </tr>
          <tr>
            {BASES_ORDER.map((b) => (
              <th key={b} className="print-codon-base">
                {b}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BASES_ORDER.map((first) => (
            <tr key={first}>
              <th className="print-codon-base">{first}</th>
              {BASES_ORDER.map((second) => (
                <td key={second}>
                  {BASES_ORDER.map((third) => {
                    const codon = first + second + third;
                    const amino = aminoAcid(codon);
                    return (
                      <div key={third} className={amino === "Stop" ? "is-stop" : amino === "Met" ? "is-start" : ""}>
                        <span className="print-codon-code">{codon}</span> {name(amino)}
                      </div>
                    );
                  })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {question.legend && (
        <p className="print-codon-legend">
          {Object.entries(AMINO_NAMES).map(([short, names], i) => (
            <Fragment key={short}>
              {i > 0 && " · "}
              <span className="whitespace-nowrap">
                <b>{short}</b> — {language === "en" ? names.en : names.ka}
              </span>
            </Fragment>
          ))}
        </p>
      )}
    </div>
  );
}
