"use client";

import { useT } from "@/i18n/language";
import type { FillBlankQuestion } from "@/lib/storage/types";
import { sameRef, tokenize, wordRefs } from "@/lib/words";
import { useTypography } from "./Typography";

/** The missing words, in the order they appear (for the answer table). */
export function fillBlankAnswers(question: FillBlankQuestion): string[] {
  const tokens = tokenize(question.body);
  const refs = wordRefs(tokens);
  return refs.filter((ref) => ref && question.blanks.some((b) => sameRef(b, ref))).map((ref) => ref!.word);
}

/**
 * The text with gaps instead of the chosen words. A hint (e.g. the base
 * form "წერა") is printed after its gap. The answer key fills the gaps.
 */
export function FillBlankPrint({ question, answerKey }: { question: FillBlankQuestion; answerKey: boolean }) {
  const t = useT();
  const fix = useTypography();
  const tokens = tokenize(fix(question.body));
  const refs = wordRefs(tokens);
  const bank = fillBlankAnswers(question).sort((a, b) => a.localeCompare(b, "ka"));
  return (
    <div>
      {question.wordBank && bank.length > 0 && (
        <p className="print-word-bank mb-[2mm]">
          <span className="font-semibold">{t("map.wordBankTitle")}</span> {bank.join("  ·  ")}
        </p>
      )}
      <p className="print-wide-lines">
        {tokens.map((token, i) => {
          const blank = question.blanks.find((b) => sameRef(b, refs[i]));
          if (!blank) return <span key={i}>{token.text}</span>;
          return (
            <span key={i}>
              <span className="print-gap" style={{ minWidth: `${Math.max(18, token.text.length * 2.4 + 6)}mm` }}>
                {answerKey ? token.text : ""}
              </span>
              {blank.hint && <span className="print-gap-hint"> ({fix(blank.hint)})</span>}
            </span>
          );
        })}
      </p>
    </div>
  );
}
