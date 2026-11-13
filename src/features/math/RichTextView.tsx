"use client";

import { convertLatexToMarkup } from "mathlive";
import { Fragment, type ReactNode } from "react";
import { useTypography } from "@/features/print/Typography";
import type { RichText, TextMark } from "@/lib/richText";

/**
 * Shows rich text read-only: text as-is, formulas drawn as static math.
 * Uses MathLive's own renderer, so formulas look the same as in the editor
 * (and later on paper). The math fonts/styles are loaded in layout.tsx.
 */
export function RichTextView({ value, className = "" }: { value: RichText; className?: string }) {
  // On paper for Georgian tests: „quotes“ and long dashes (see features/print/Typography).
  const fix = useTypography();
  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {value.map((segment, i) =>
        segment.type === "text" ? (
          <Formatted key={i} marks={segment.marks}>
            {fix(segment.text)}
          </Formatted>
        ) : (
          <span
            key={i}
            className="math-static"
            // convertLatexToMarkup turns LaTeX into HTML. It's our own saved
            // data and MathLive escapes text, so inserting it is safe here.
            dangerouslySetInnerHTML={{ __html: convertLatexToMarkup(segment.latex) }}
          />
        ),
      )}
    </span>
  );
}

/** Wraps text in its formatting: <strong>, <em>, <u> and the word box. */
function Formatted({ marks, children }: { marks?: TextMark[]; children: ReactNode }) {
  let content = children;
  if (marks?.includes("bold")) content = <strong>{content}</strong>;
  if (marks?.includes("italic")) content = <em>{content}</em>;
  if (marks?.includes("underline")) content = <u>{content}</u>;
  if (marks?.includes("box")) content = <span className="rt-box">{content}</span>;
  return <>{content}</>;
}
