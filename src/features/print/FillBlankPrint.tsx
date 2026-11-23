"use client";

import { WordBox } from "@/subjects/english/EnglishPrint";
import { optionLabel } from "@/lib/questions";
import type { FillBlankQuestion, LabelStyle } from "@/lib/storage/types";
import { sameRef, tokenize, wordRefs } from "@/lib/words";
import { useTypography } from "./Typography";

/** The missing words, in the order they appear in the text (for the answer table). */
export function fillBlankAnswers(question: FillBlankQuestion): string[] {
  const refs = wordRefs(tokenize(question.body));
  return refs.filter((ref) => ref && question.blanks.some((b) => sameRef(b, ref))).map((ref) => ref!.word);
}

/** Each gap's choices in order (shuffled by lib/variants.ts), by the gap's place in `blanks`. */
const choicesOf = (question: FillBlankQuestion, index: number) => {
  const blank = question.blanks[index];
  return question.shownChoices?.[index] ?? [blank.word, ...(blank.options ?? []).filter((o) => o.trim())];
};

/** For the answer table in "choice" mode: the letters of the right choices, gap by gap. */
export function fillBlankChoiceAnswers(question: FillBlankQuestion, labelStyle: LabelStyle): string[] {
  const refs = wordRefs(tokenize(question.body));
  return refs
    .map((ref) => (ref ? question.blanks.findIndex((b) => sameRef(b, ref)) : -1))
    .filter((index) => index >= 0)
    .map((index) => optionLabel(choicesOf(question, index).indexOf(question.blanks[index].word), labelStyle));
}

/**
 * The text with gaps instead of the chosen words. Gaps can be numbered (1),
 * (2)…; a hint like "(go)" follows its gap. Word box mode prints the words
 * (and extra ones) in a box; choice mode lists A/B/C/D for each gap under
 * the text. The order of the gaps never changes; the answer key fills them.
 */
export function FillBlankPrint({ question, labelStyle, answerKey }: { question: FillBlankQuestion; labelStyle: LabelStyle; answerKey: boolean }) {
  const fix = useTypography();
  const tokens = tokenize(fix(question.body));
  const refs = wordRefs(tokens);
  const bank = question.shownBank ?? [...question.blanks.map((b) => b.word), ...question.extras.filter((w) => w.trim())];
  // Every gap is equally long (fits the longest answer, up to 45 mm), so its length gives nothing away.
  const gapWidth = Math.min(45, Math.max(18, ...question.blanks.map((b) => b.word.length * 2.4 + 6)));
  let gapNumber = 0;
  const gaps: { number: number; index: number }[] = [];
  return (
    <div>
      {question.mode === "bank" && <WordBox words={bank} />}
      <p className="print-wide-lines">
        {tokens.map((token, i) => {
          const index = refs[i] ? question.blanks.findIndex((b) => sameRef(b, refs[i])) : -1;
          if (index < 0) return <span key={i}>{token.text}</span>;
          const blank = question.blanks[index];
          gapNumber++;
          gaps.push({ number: gapNumber, index });
          return (
            <span key={i}>
              {question.numbered && <span className="print-gap-number">({gapNumber})</span>}
              <span className="print-gap" style={{ minWidth: `${gapWidth}mm` }}>
                {answerKey ? token.text : ""}
              </span>
              {/* Hints are for writing the word; with A/B/C choices the editor hides them, so does the paper. */}
              {blank.hint && question.mode !== "choice" && <span className="print-gap-hint"> ({fix(blank.hint)})</span>}
            </span>
          );
        })}
      </p>
      {question.mode === "choice" && (
        <ol className="print-gap-choices">
          {gaps.map(({ number, index }) => {
            const choices = choicesOf(question, index);
            return (
              <li key={number}>
                <span className="print-option-label">{number}</span>
                {choices.map((choice, j) => (
                  <span key={j} className={answerKey && choice === question.blanks[index].word ? "print-option is-correct" : "print-option"}>
                    <span className="print-option-label">{optionLabel(j, labelStyle)}</span> {choice}
                  </span>
                ))}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
