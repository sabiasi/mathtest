"use client";

import { mathMarkup } from "@/features/math/RichTextView";
import { Fragment } from "react";
import { chemLatex, parseEquation, type Term } from "@/lib/chem";
import type { BalanceQuestion } from "@/lib/storage/types";

/** Drawn chemistry (mhchem through MathLive, as everywhere else). */
function Chem({ code }: { code: string }) {
  return <span className="math-static" dangerouslySetInnerHTML={{ __html: mathMarkup(chemLatex(code)) }} />;
}

/** [ ] H2 + [ ] O2 → [ ] H2O — a box before every substance (filled on the key). */
export function EquationWithBoxes({ source, answerKey }: { source: string; answerKey: boolean }) {
  const equation = parseEquation(source);
  if (!equation) return <Chem code={source} />;
  const side = (terms: Term[]) =>
    terms.map((term, i) => (
      <Fragment key={i}>
        {i > 0 && <span className="print-eq-plus">+</span>}
        <span className="print-eq-term">
          <span className="print-box print-eq-box">{answerKey ? term.coefficient : ""}</span>
          <Chem code={term.formula} />
        </span>
      </Fragment>
    ));
  return (
    <span className="print-equation">
      {side(equation.left)}
      <span className="print-eq-arrow">
        <Chem code={equation.arrow} />
      </span>
      {side(equation.right)}
    </span>
  );
}

/** The coefficients in order ("2 1 2"), for the answer table. */
export const balanceAnswer = (source: string) =>
  [...(parseEquation(source)?.left ?? []), ...(parseEquation(source)?.right ?? [])].map((t) => t.coefficient).join(" ");

export function BalancePrint({ question, answerKey }: { question: BalanceQuestion; answerKey: boolean }) {
  const equations = question.equations.filter((e) => e.balanced.trim());
  return (
    <ol className="print-equations">
      {equations.map((equation, i) => (
        <li key={equation.id} className="flex items-center gap-[2mm]">
          {equations.length > 1 && <span className="print-option-label">{i + 1})</span>}
          <EquationWithBoxes source={equation.balanced} answerKey={answerKey} />
        </li>
      ))}
    </ol>
  );
}
