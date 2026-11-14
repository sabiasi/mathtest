"use client";

import { convertLatexToMarkup } from "mathlive";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useTypography } from "@/features/print/Typography";
import type { RichText, RichTextSegment, TextMark } from "@/lib/richText";

/**
 * Shows rich text read-only: text as-is, formulas drawn as static math.
 * Uses MathLive's own renderer, so formulas look the same as in the editor
 * (and later on paper). The math fonts/styles are loaded in layout.tsx.
 */
export function RichTextView({ value, className = "" }: { value: RichText; className?: string }) {
  // On paper for Georgian tests: „quotes“ and long dashes (see features/print/Typography).
  const fix = useTypography();
  const piece = (segment: RichTextSegment, key: number) =>
    segment.type === "text" ? (
      <Formatted key={key} marks={segment.marks}>
        {fix(segment.text)}
      </Formatted>
    ) : (
      <span
        key={key}
        className="math-static"
        // convertLatexToMarkup turns LaTeX into HTML. It's our own saved
        // data and MathLive escapes text, so inserting it is safe here.
        dangerouslySetInnerHTML={{ __html: convertLatexToMarkup(segment.latex) }}
      />
    );
  // On paper a formula can't wrap: one that is wider than its question is made smaller until it fits.
  const rootRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let alive = true;
    fitFormulas(root);
    // Formulas change width when the math fonts arrive.
    document.fonts?.ready.then(() => alive && fitFormulas(root));
    return () => {
      alive = false;
    };
  });
  return (
    <span ref={rootRef} className={`whitespace-pre-wrap ${className}`}>
      {boxRuns(value).map((run) =>
        run.boxed ? (
          // Neighbours in the same word box share ONE border (as in the editor).
          <span key={run.start} className="rt-box">
            {run.segments.map((segment, i) => piece(segment, run.start + i))}
          </span>
        ) : (
          run.segments.map((segment, i) => piece(segment, run.start + i))
        ),
      )}
    </span>
  );
}

/** A formula is never made smaller than this share of its normal size (it must stay readable). */
const SMALLEST_FORMULA = 0.55;

/**
 * Printed questions only (inside `.print-question`): a formula that sticks
 * out past the right edge of its question — a long answer on the key, or any
 * long formula on a two-column paper — gets a smaller font so that it ends at
 * the edge instead of running into the next column or off the page.
 * (Text wraps by itself; a formula is one unbreakable piece.)
 */
function fitFormulas(root: HTMLElement) {
  const question = root.closest(".print-question");
  if (!question) return;
  for (const formula of root.querySelectorAll<HTMLElement>(":scope > .math-static, :scope > .rt-box > .math-static")) {
    formula.style.fontSize = ""; // measure at the normal size
    const edge = question.getBoundingClientRect().right;
    const box = formula.getBoundingClientRect();
    if (box.width === 0 || box.right <= edge + 0.5) continue;
    const share = Math.max(SMALLEST_FORMULA, (edge - box.left) / box.width);
    // .math-static is 1.1em (globals.css).
    formula.style.fontSize = `${(1.1 * share).toFixed(3)}em`;
  }
}

/** Splits rich text into stretches that are inside a word box and stretches that are not. */
function boxRuns(value: RichText): { boxed: boolean; start: number; segments: RichTextSegment[] }[] {
  const runs: { boxed: boolean; start: number; segments: RichTextSegment[] }[] = [];
  value.forEach((segment, i) => {
    const boxed = segment.marks?.includes("box") ?? false;
    const last = runs[runs.length - 1];
    if (last && last.boxed === boxed) last.segments.push(segment);
    else runs.push({ boxed, start: i, segments: [segment] });
  });
  return runs;
}

/** Wraps text in its formatting: <strong>, <em>, <u> (the word box is drawn around the whole stretch, above). */
function Formatted({ marks, children }: { marks?: TextMark[]; children: ReactNode }) {
  let content = children;
  if (marks?.includes("underline")) content = <u>{content}</u>;
  if (marks?.includes("italic")) content = <em>{content}</em>;
  if (marks?.includes("bold")) content = <strong>{content}</strong>;
  return <>{content}</>;
}
