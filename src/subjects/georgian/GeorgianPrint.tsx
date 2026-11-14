"use client";

/**
 * How the Georgian Language & Literature questions look on paper (and in
 * the answer key). Black on white only. Text goes through useTypography(),
 * so it's printed with Georgian quotation marks and dashes.
 */
import { RichTextView } from "@/features/math/RichTextView";
import { useTypography } from "@/features/print/Typography";
import { useT } from "@/i18n/language";
import { GeorgianInstruction } from "@/subjects/english/EnglishPrint";
import { isRichTextEmpty } from "@/lib/richText";
import { optionLabel } from "@/lib/questions";
import type {
  LabelStyle,
  EssayQuestion,
  FindMistakeQuestion,
  GrammarTableQuestion,
  MarkWordsQuestion,
  PassageQuestion,
  PoemQuestion,
  SentenceAnalysisQuestion,
} from "@/lib/storage/types";
import { sameRef, tokenize, wordRefs, type WordRef } from "@/lib/words";
import { ESSAY_FIRST, paragraphs, stanzas } from "./text";

// ---------------------------------------------------------------------------
// Reading texts and poems
// ---------------------------------------------------------------------------

/** Must match .print-passage-text's line-height in globals.css. */
const PASSAGE_LINE_HEIGHT = 1.65;

/** Title, author and the instruction above a text (only on its first block). */
function TextHeading({ question, bilingual }: { question: PassageQuestion | PoemQuestion; bilingual: boolean }) {
  const fix = useTypography();
  return (
    <>
      {!isRichTextEmpty(question.text) && <RichTextView value={question.text} className="print-text mb-[2mm] block" />}
      <GeorgianInstruction text={question.instructionKa} show={bilingual} />
      {question.title && <p className="print-passage-title">{fix(question.title)}</p>}
      {question.author && <p className="print-passage-author">{fix(question.author)}</p>}
    </>
  );
}

/**
 * One paragraph of a reading text. Line numbers (every 5th) sit in the
 * margin: every line is exactly the same height, so line n is at n × height.
 * `lineStart` = the number of this paragraph's first line (measured by
 * usePrintLayout); the numbers column is cut off where the paragraph ends.
 */
export function PassagePiece({
  question,
  index,
  lineStart,
  bilingual = false,
}: {
  question: PassageQuestion;
  index: number;
  lineStart: number;
  bilingual?: boolean;
}) {
  const fix = useTypography();
  const text = paragraphs(question.body)[index] ?? "";
  const numbers: number[] = [];
  if (question.lineNumbers) {
    for (let n = Math.ceil(lineStart / 5) * 5; n < lineStart + 400; n += 5) numbers.push(n);
  }
  return (
    <div className="print-passage">
      {index === 0 && <TextHeading question={question} bilingual={bilingual} />}
      <div className="print-passage-text" data-passage-lines="">
        {question.lineNumbers && (
          <div className="print-line-numbers" aria-hidden="true">
            {numbers.map((n) => (
              // The outer span keeps the text's font size, so "em" here = one text line;
              // only the inner number is smaller.
              <span key={n} style={{ top: `${(n - lineStart) * PASSAGE_LINE_HEIGHT}em`, height: `${PASSAGE_LINE_HEIGHT}em` }}>
                <small>{n}</small>
              </span>
            ))}
          </div>
        )}
        <p>
          {/* "Which paragraph mentions…": A, B, C… before each paragraph */}
          {question.paragraphLetters && <strong className="print-paragraph-letter">{String.fromCharCode(65 + index)} </strong>}
          {fix(text)}
        </p>
      </div>
    </div>
  );
}

/** One stanza of a poem; verses keep their line breaks and leading spaces. Every 5th verse is numbered. */
export function PoemPiece({ question, index, bilingual = false }: { question: PoemQuestion; index: number; bilingual?: boolean }) {
  const fix = useTypography();
  const all = stanzas(question.body);
  const verses = all[index] ?? [];
  // Verses before this stanza (verse numbering continues across stanzas).
  const before = all.slice(0, index).reduce((sum, stanza) => sum + stanza.length, 0);
  return (
    <div className="print-poem">
      {index === 0 && <TextHeading question={question} bilingual={bilingual} />}
      <div className="print-poem-stanza">
        {verses.map((verse, i) => {
          const n = before + i + 1;
          return (
            <div key={i} className="print-verse">
              {question.lineNumbers && n % 5 === 0 && <span className="print-verse-no">{n}</span>}
              {fix(verse)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Essay
// ---------------------------------------------------------------------------

export function EssayLines({ count }: { count: number }) {
  return (
    <div className="print-essay-lines">
      {Array.from({ length: Math.max(0, count) }, (_, i) => (
        <div key={i} className="print-line" />
      ))}
    </div>
  );
}

export function EssayPrint({ question }: { question: EssayQuestion }) {
  const t = useT();
  const fix = useTypography();
  const guide = question.guide.filter((g) => g.trim());
  return (
    <div>
      {guide.length > 0 && (
        <div className="print-essay-guide">
          <p className="font-semibold">{t("essay.guideTitle")}</p>
          <ul>
            {guide.map((point, i) => (
              <li key={i}>{fix(point)}</li>
            ))}
          </ul>
        </div>
      )}
      {question.length && (
        <p className="print-essay-length">
          {t("essay.lengthLabel")} {fix(question.length)}
        </p>
      )}
      <EssayLines count={Math.min(question.lines, ESSAY_FIRST)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grammar
// ---------------------------------------------------------------------------

/** A text with some words marked (underlined on the answer key). */
function WordText({ text, marked, className }: { text: string; marked: WordRef[]; className?: string }) {
  const fix = useTypography();
  const tokens = tokenize(fix(text));
  const refs = wordRefs(tokens);
  return (
    <p className={className}>
      {tokens.map((token, i) =>
        marked.some((m) => sameRef(m, refs[i])) ? (
          <span key={i} className="print-marked">
            {token.text}
          </span>
        ) : (
          <span key={i}>{token.text}</span>
        ),
      )}
    </p>
  );
}

/** "Underline the nouns": the text with room to underline; the key underlines the answers. */
export function MarkWordsPrint({ question, answerKey }: { question: MarkWordsQuestion; answerKey: boolean }) {
  return <WordText text={question.body} marked={answerKey ? question.marked : []} className="print-wide-lines" />;
}

/** Word | case (or screeve, part of speech…) — empty cells for students. */
export function GrammarTablePrint({ question, answerKey }: { question: GrammarTableQuestion; answerKey: boolean }) {
  const t = useT();
  const fix = useTypography();
  const rows = question.rows.filter((row) => row.word.trim());
  return (
    <div>
      {question.bank.length > 0 && (
        <p className="print-word-bank">
          <span className="font-semibold">{t("grammar.bankTitle")}</span> {question.bank.join("  ·  ")}
        </p>
      )}
      <table className="print-table">
        <thead>
          <tr>
            <th>{question.wordTitle || t("grammar.wordDefault")}</th>
            <th>{question.answerTitle || t("grammar.answerDefault")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{fix(row.word)}</td>
              <td className="print-key-text">{answerKey ? row.answer : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Each sentence, then a line for the corrected word. The key underlines the
 * mistake and gives the correction. In the A–D style the sentence has up to
 * four underlined parts lettered A, B, C, D, and a box for the wrong one.
 */
export function FindMistakePrint({ question, labelStyle, answerKey }: { question: FindMistakeQuestion; labelStyle: LabelStyle; answerKey: boolean }) {
  const t = useT();
  const items = question.items.filter((item) => item.sentence.trim());
  if (question.style === "abcd") return <MistakeAbcdPrint items={items} labelStyle={labelStyle} answerKey={answerKey} />;
  return (
    <ol className="print-mistakes">
      {items.map((item, i) => (
        <li key={item.id}>
          <div className="flex gap-[2mm]">
            <span className="print-option-label">{i + 1})</span>
            <WordText text={item.sentence} marked={answerKey && item.mistake ? [item.mistake] : []} />
          </div>
          <div className="mt-[1.5mm] flex items-end gap-[2mm] pl-[5mm]">
            <span>{t("mistake.correctionLabel")}</span>
            <span className="print-answer-line">{answerKey && item.correction && <span className="print-key-answer">{item.correction}</span>}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function MistakeAbcdPrint({ items, labelStyle, answerKey }: { items: FindMistakeQuestion["items"]; labelStyle: LabelStyle; answerKey: boolean }) {
  const t = useT();
  return (
    <ol className="print-mistakes">
      {items.map((item, i) => {
        const tokens = tokenize(item.sentence);
        const refs = wordRefs(tokens);
        const parts = item.parts ?? [];
        // Letters follow the order of the parts in the sentence.
        const ordered = refs.map((ref) => parts.findIndex((p) => sameRef(p, ref))).filter((index) => index >= 0);
        const wrong = item.mistake ? ordered.findIndex((index) => sameRef(parts[index], item.mistake)) : -1;
        return (
          <li key={item.id}>
            <div className="flex flex-wrap items-baseline gap-[2mm]">
              <span className="print-option-label">{i + 1})</span>
              <p className="print-abcd-line">
                {tokens.map((token, j) => {
                  const partIndex = refs[j] ? parts.findIndex((p) => sameRef(p, refs[j])) : -1;
                  if (partIndex < 0) return <span key={j}>{token.text}</span>;
                  return (
                    <span key={j} className="print-abcd-part">
                      <u>{token.text}</u>
                      <span className="print-abcd-letter">{optionLabel(ordered.indexOf(partIndex), labelStyle)}</span>
                    </span>
                  );
                })}
              </p>
              <span className="ml-auto flex items-center gap-[1.5mm]">
                <span className="print-box">{answerKey && wrong >= 0 ? optionLabel(wrong, labelStyle) : ""}</span>
                {answerKey && item.correction && <span className="print-key-text">→ {item.correction}</span>}
              </span>
            </div>
            {!answerKey && (
              <div className="mt-[1mm] flex items-end gap-[2mm] pl-[5mm]">
                <span>{t("mistake.correctionLabel")}</span>
                <span className="print-answer-line" />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** The sentence, then "subject: ____", "predicate: ____"… */
export function SentenceAnalysisPrint({ question, answerKey }: { question: SentenceAnalysisQuestion; answerKey: boolean }) {
  const fix = useTypography();
  return (
    <div className="print-parts-area">
      <p className="print-sentence">{fix(question.sentence)}</p>
      <div className="print-parts">
        {question.parts.map((part) => (
          <div key={part.id} className="flex items-end gap-[2mm]">
            <span className="whitespace-nowrap">{part.role}:</span>
            <span className="print-answer-line">{answerKey && part.answer && <span className="print-key-answer">{part.answer}</span>}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
