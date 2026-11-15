"use client";

import { RichTextView } from "@/features/math/RichTextView";
import { useT } from "@/i18n/language";
import { matchingAnswers, matchingLeftColumn, matchingRightColumn } from "@/lib/matching";
import { optionLabel } from "@/lib/questions";
import type { LabelStyle, MatchingQuestion } from "@/lib/storage/types";

// The pure helpers live in lib/matching.ts (the Word export on the server uses them too).
export { matchingAnswers, matchingLeftColumn, matchingRightColumn };

/**
 *   [Person]                  [Date]
 *   1. Davit the Builder      ა) 1801
 *   2. Queen Tamar            ბ) 1121
 *   Answer: 1–[ ] 2–[ ]
 */
export function MatchingPrint({ question, labelStyle, answerKey }: { question: MatchingQuestion; labelStyle: LabelStyle; answerKey: boolean }) {
  const t = useT();
  const left = matchingLeftColumn(question);
  const right = matchingRightColumn(question);
  const answers = matchingAnswers(question, labelStyle);
  return (
    <div className="print-match-area">
      <div className="print-match">
        <div>
          {question.leftTitle && <p className="print-match-title">{question.leftTitle}</p>}
          <ol>
            {left.map((pair, index) => (
              <li key={pair.id} className="print-option">
                <span className="print-option-label">{index + 1}.</span>
                <RichTextView value={pair.left} />
              </li>
            ))}
          </ol>
        </div>
        <div>
          {question.rightTitle && <p className="print-match-title">{question.rightTitle}</p>}
          <ol>
            {right.map((item, index) => (
              <li key={item.id} className="print-option">
                <span className="print-option-label">{optionLabel(index, labelStyle)})</span>
                <RichTextView value={item.text} />
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="print-boxes">
        <span>{t("print.answer")}</span>
        {left.map((pair, index) => (
          <span key={pair.id} className="print-box-pair">
            {index + 1}–<span className="print-box">{answerKey ? answers[index] : ""}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
