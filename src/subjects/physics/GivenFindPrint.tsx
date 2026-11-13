"use client";

import { RichTextView } from "@/features/math/RichTextView";
import { useT } from "@/i18n/language";
import { isRichTextEmpty } from "@/lib/richText";
import type { GivenFindQuestion } from "@/lib/storage/types";

/**
 * The printed "Given / Find / Solution" frame, as in Georgian school
 * notebooks:
 *
 *   მოცემულია:     │ ამოხსნა:
 *                  │ ______________________
 *   ───────────────│ ______________________
 *   საპოვნელია:    │ ______________________
 *
 * On the answer key the teacher's own given / find / solution / answer
 * are written in.
 */
export function GivenFindPrint({ question, answerKey }: { question: GivenFindQuestion; answerKey: boolean }) {
  const t = useT();
  const solution = answerKey && !isRichTextEmpty(question.solution);
  return (
    <div>
      <div className="print-gf">
        <div className="print-gf-left">
          <div className="print-gf-given">
            <span className="print-gf-label">{t("gf.given")}</span>
            {answerKey && <RichTextView value={question.given} className="print-key-text block" />}
          </div>
          <div className="print-gf-find">
            <span className="print-gf-label">{t("gf.find")}</span>
            {answerKey && <RichTextView value={question.find} className="print-key-text block" />}
          </div>
        </div>
        <div className="print-gf-right">
          <span className="print-gf-label">{t("gf.solution")}</span>
          {solution ? (
            <RichTextView value={question.solution} className="print-key-text block" />
          ) : (
            Array.from({ length: question.lines }, (_, i) => <div key={i} className="print-line" />)
          )}
        </div>
      </div>
      {answerKey && !isRichTextEmpty(question.answer) && (
        <p className="print-gf-answer">
          {t("print.answer")} <RichTextView value={question.answer} className="print-key-text" />
        </p>
      )}
    </div>
  );
}
