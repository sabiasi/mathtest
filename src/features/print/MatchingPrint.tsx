"use client";

import { RichTextView } from "@/features/math/RichTextView";
import { useT } from "@/i18n/language";
import { optionLabel } from "@/lib/questions";
import { isRichTextEmpty } from "@/lib/richText";
import type { LabelStyle, MatchingQuestion } from "@/lib/storage/types";

/** The right column in the order shown on paper (shuffled by lib/variants.ts). */
export function matchingRightColumn(question: MatchingQuestion) {
  const items = [
    ...question.pairs.map((p) => ({ id: p.id, text: p.right })),
    ...question.extras.map((e) => ({ id: e.id, text: e.text })),
  ].filter((item) => !isRichTextEmpty(item.text));
  if (!question.shownOrder) return items;
  const byId = new Map(items.map((item) => [item.id, item]));
  return question.shownOrder.map((id) => byId.get(id)).filter((item) => item !== undefined);
}

/** Pairs that are filled in on both sides (empty rows aren't printed). */
export const matchingLeftColumn = (question: MatchingQuestion) =>
  question.pairs.filter((p) => !isRichTextEmpty(p.left) && !isRichTextEmpty(p.right));

/** For each left item (in order), the letter of its partner: ["ბ", "ა", "დ"]. */
export function matchingAnswers(question: MatchingQuestion, labelStyle: LabelStyle): string[] {
  const right = matchingRightColumn(question);
  return matchingLeftColumn(question).map((pair) => optionLabel(right.findIndex((item) => item.id === pair.id), labelStyle));
}

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
    <div>
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
