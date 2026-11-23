"use client";

/**
 * How the English blocks and questions look on paper. Labels come from the
 * dictionary — inside the printed sheets of an English test that's English
 * (see LanguageOverride in PrintView).
 * Black on white only.
 */
import qrcode from "qrcode-generator";
import { QuestionImageView } from "@/components/QuestionImageView";
import { RichTextView } from "@/features/math/RichTextView";
import { useT } from "@/i18n/language";
import { optionLabel } from "@/lib/questions";
import { buildCrossword, buildWordSearch } from "@/lib/puzzles";
import { isRichTextEmpty } from "@/lib/richText";
import type {
  CrosswordQuestion,
  LabelStyle,
  ListeningQuestion,
  OddOneOutQuestion,
  PictureMatchQuestion,
  SectionQuestion,
  SpeakingQuestion,
  TransformationQuestion,
  WordFormationQuestion,
  WordSearchQuestion,
} from "@/lib/storage/types";
import { findRef, tokenize } from "@/lib/words";

// ---------------------------------------------------------------------------
// Section heading: "READING — 20 points"
// ---------------------------------------------------------------------------

export function SectionPrint({ question, points, showPoints }: { question: SectionQuestion; points: number; showPoints: boolean }) {
  const t = useT();
  const name = question.title.trim() || t(`section.${question.kind}`);
  return (
    <div className="print-section">
      <div className="print-section-bar">
        <span>{name}</span>
        {showPoints && points > 0 && <span>{t(points === 1 ? "print.pointsOne" : "print.pointsMany", { points })}</span>}
      </div>
      {!isRichTextEmpty(question.text) && <RichTextView value={question.text} className="print-text mt-[1.5mm] block" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listening: instructions, how many times, QR code; transcript on the key
// ---------------------------------------------------------------------------

/** A QR code (SVG) for a link. */
function qrSvg(link: string): string | null {
  try {
    const qr = qrcode(0, "M");
    qr.addData(link);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  } catch {
    return null; // a link too long for a QR code
  }
}

export function QrCode({ link }: { link: string }) {
  const svg = qrSvg(link);
  return svg ? <span className="print-qr" dangerouslySetInnerHTML={{ __html: svg }} /> : null;
}

export function ListeningPrint({ question }: { question: ListeningQuestion }) {
  const t = useT();
  return (
    <div className="print-listening">
      <div className="min-w-0 flex-1">
        {!isRichTextEmpty(question.text) && <RichTextView value={question.text} className="print-text block" />}
        <p className="print-listening-plays">{t(`listening.plays${question.plays}`)}</p>
      </div>
      {question.showQr && question.link && (
        <div className="print-listening-qr">
          <QrCode link={question.link} />
          <span>{t("listening.scan")}</span>
        </div>
      )}
    </div>
  );
}

/** Splits a transcript into paragraphs (each a printed block on the answer key). */
export const transcriptParagraphs = (transcript: string) => transcript.split("\n").map((line) => line.trim()).filter(Boolean);

export function TranscriptPiece({ question, index }: { question: ListeningQuestion; index: number }) {
  const t = useT();
  const text = transcriptParagraphs(question.transcript)[index] ?? "";
  return (
    <div className="print-transcript">
      {index === 0 && <p className="print-transcript-title">{t("listening.transcript")}</p>}
      <p>{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Speaking cards: a full page of 2 or 4 cards with dashed cut lines
// ---------------------------------------------------------------------------

export function SpeakingPage({ question, page }: { question: SpeakingQuestion; page: number }) {
  const t = useT();
  const cards = question.cards.slice(page * question.perPage, (page + 1) * question.perPage);
  return (
    <div className={`print-cards per-${question.perPage}`}>
      {cards.map((card, i) => (
        <div key={card.id} className="print-card">
          <p className="print-card-number">
            ✂ {t("speaking.card")} {page * question.perPage + i + 1}
          </p>
          {card.title && <p className="print-card-title">{card.title}</p>}
          <ul>
            {card.prompts
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, j) => (
                <li key={j}>{line}</li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grammar transformation and word formation
// ---------------------------------------------------------------------------

export function TransformationPrint({ question, answerKey }: { question: TransformationQuestion; answerKey: boolean }) {
  const items = question.items.filter((item) => item.original.trim());
  return (
    <ol className="print-items">
      {items.map((item, i) => (
        <li key={item.id}>
          <p className="flex gap-[2mm]">
            <span className="print-option-label">{i + 1}</span>
            <span>{item.original}</span>
          </p>
          <p className="print-keyword">{item.keyWord.toLocaleUpperCase("en")}</p>
          <p className="print-transform-line">
            {item.before && <span>{item.before}</span>}
            <span className="print-gap print-gap-long">{answerKey ? item.answer : ""}</span>
            {item.after && <span>{item.after}</span>}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** One line per item: the sentence with a numbered gap, and the ROOT word at the end of the line. */
export function WordFormationPrint({ question, answerKey }: { question: WordFormationQuestion; answerKey: boolean }) {
  const items = question.items.filter((item) => item.sentence.trim());
  return (
    <ol className="print-items">
      {items.map((item, i) => {
        const tokens = tokenize(item.sentence);
        const gapIndex = item.gap ? findRef(tokens, item.gap) : -1;
        return (
          <li key={item.id} className="print-wf-line">
            <span className="min-w-0 flex-1">
              {tokens.map((token, j) =>
                j === gapIndex ? (
                  <span key={j}>
                    <span className="print-gap-number">({i + 1})</span>
                    <span className="print-gap" style={{ minWidth: "28mm" }}>
                      {answerKey ? token.text : ""}
                    </span>
                  </span>
                ) : (
                  <span key={j}>{token.text}</span>
                ),
              )}
            </span>
            <span className="print-root">{item.root.toLocaleUpperCase("en")}</span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Vocabulary: pictures, odd one out
// ---------------------------------------------------------------------------

/** The words in a bordered box (shuffled by lib/variants.ts). */
export function WordBox({ words }: { words: string[] }) {
  if (words.length === 0) return null;
  return (
    <div className="print-word-box">
      {words.map((word, i) => (
        <span key={i}>{word}</span>
      ))}
    </div>
  );
}

export function PictureMatchPrint({ question, answerKey }: { question: PictureMatchQuestion; answerKey: boolean }) {
  const bank = question.shownBank ?? [...question.pictures.map((p) => p.answer), ...question.extras].filter((w) => w.trim());
  return (
    <div>
      {question.wordBank && <WordBox words={bank} />}
      <div className="print-pictures">
        {question.pictures.map((picture, i) => (
          <figure key={picture.id}>
            <QuestionImageView
              image={{ id: picture.id, imageId: picture.imageId, width: picture.width, height: picture.height, widthPercent: 100, position: "above", caption: "" }}
            />
            <figcaption>
              <span className="print-option-label">{i + 1}</span>
              <span className="print-answer-line">{answerKey && picture.answer && <span className="print-key-answer">{picture.answer}</span>}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function OddOneOutPrint({ question, answerKey }: { question: OddOneOutQuestion; answerKey: boolean }) {
  const rows = question.rows.filter((row) => row.words.some((w) => w.trim()));
  return (
    <ol className="print-items">
      {rows.map((row, i) => (
        <li key={row.id} className="print-odd-row">
          <span className="print-option-label">{i + 1}</span>
          {row.words
            .map((word, j) => ({ word, j }))
            .filter(({ word }) => word.trim())
            .map(({ word, j }) => (
              <span key={j} className={answerKey && row.odd === j ? "print-circled" : undefined}>
                {word}
              </span>
            ))}
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Crossword and word search
// ---------------------------------------------------------------------------

export function CrosswordPrint({ question, answerKey }: { question: CrosswordQuestion; answerKey: boolean }) {
  const t = useT();
  const puzzle = buildCrossword(question.entries, question.seed);
  const clues = (across: boolean) => puzzle.placed.filter((p) => p.across === across).sort((a, b) => a.number - b.number);
  return (
    <div className="print-crossword">
      <table className="print-crossword-grid">
        <tbody>
          {puzzle.grid.map((row, r) => (
            <tr key={r}>
              {row.map((letter, c) => (
                <td key={c} className={letter ? "is-cell" : undefined}>
                  {letter && puzzle.numbers.has(`${r}:${c}`) && <span className="print-cw-number">{puzzle.numbers.get(`${r}:${c}`)}</span>}
                  {letter && answerKey ? letter : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="print-clues">
        {([true, false] as const).map((across) =>
          clues(across).length > 0 ? (
            <div key={String(across)}>
              <p className="font-bold">{t(across ? "crossword.across" : "crossword.down")}</p>
              <ol>
                {clues(across).map((p) => (
                  <li key={p.id}>
                    <span className="font-semibold">{p.number}</span> {p.clue}
                    {answerKey && <span className="print-key-text"> — {p.word}</span>}
                  </li>
                ))}
              </ol>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

export function WordSearchPrint({ question, answerKey }: { question: WordSearchQuestion; answerKey: boolean }) {
  const puzzle = buildWordSearch(question.words, question.size, question.allDirections, question.seed);
  // No words yet: no grid (it would be only random letters).
  if (puzzle.found.length === 0) return null;
  const hidden = new Set(answerKey ? puzzle.found.flatMap((f) => f.cells.map(([r, c]) => `${r}:${c}`)) : []);
  return (
    <div className="print-wordsearch">
      <table className="print-ws-grid">
        <tbody>
          {puzzle.grid.map((row, r) => (
            <tr key={r}>
              {row.map((letter, c) => (
                <td key={c} className={hidden.has(`${r}:${c}`) ? "is-found" : undefined}>
                  {letter}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <WordBox words={puzzle.found.map((f) => f.word).sort((a, b) => a.localeCompare(b))} />
    </div>
  );
}

/** "A", "B"… for the A–D error-correction parts (English tests use Latin letters). */
export const partLetter = (index: number, style: LabelStyle) => optionLabel(index, style);
