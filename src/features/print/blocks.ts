/**
 * The printed "blocks": what the page packer (lib/paginate.ts) places on
 * pages. Usually one block per question. Long things are split so they can
 * continue on the next page:
 *   - a reading text: one block per paragraph
 *   - a poem: one block per stanza
 *   - an essay: the question with its first lines, then blocks of lines
 * A block's key is the question id, or "id~piece" for the extra pieces.
 * (Pure functions; drawing a block is in pieces.tsx.)
 */
import { questionNumbers } from "@/lib/questions";
import type { Question } from "@/lib/storage/types";
import { ESSAY_CHUNK, ESSAY_FIRST, paragraphs, stanzas } from "@/subjects/georgian/text";

export type PrintBlock = { key: string; question: Question; piece: string; number: number | null };

function piecesOf(question: Question): string[] {
  // A text with nothing in it still gets one (empty) block, so it isn't lost.
  if (question.type === "passage") {
    const count = paragraphs(question.body).length;
    return count ? Array.from({ length: count }, (_, i) => `p${i}`) : ["p0"];
  }
  if (question.type === "poem") {
    const count = stanzas(question.body).length;
    return count ? Array.from({ length: count }, (_, i) => `s${i}`) : ["s0"];
  }
  if (question.type === "essay") {
    const extra = Math.ceil(Math.max(0, question.lines - ESSAY_FIRST) / ESSAY_CHUNK);
    return ["", ...Array.from({ length: extra }, (_, i) => `l${i}`)];
  }
  return [""];
}

export function printBlocks(questions: Question[]): PrintBlock[] {
  const numbers = questionNumbers(questions);
  return questions.flatMap((question) =>
    piecesOf(question).map((piece) => ({
      key: piece ? `${question.id}~${piece}` : question.id,
      question,
      piece,
      number: numbers.get(question.id) ?? null,
    })),
  );
}

/** True for pieces that continue the block before them (no gap between them on paper). */
export const isContinuation = (block: PrintBlock) => /^(p|s)[1-9]|^l\d/.test(block.piece);

/** Continuations drawn with no gap: reading-text paragraphs and essay lines (stanzas keep a gap). */
export const flowsOn = (block: PrintBlock) => isContinuation(block) && block.question.type !== "poem";
