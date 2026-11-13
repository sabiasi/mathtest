"use client";

import { convertLatexToMarkup } from "mathlive";
import { Fragment } from "react";
import { useTypography } from "@/features/print/Typography";
import type { RichText } from "@/lib/richText";

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
          <Fragment key={i}>{fix(segment.text)}</Fragment>
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
