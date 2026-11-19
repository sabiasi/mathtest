/**
 * Variants: the same test with questions and/or answer options in a
 * different order, so neighbours can't copy from each other.
 *
 *   - Variant A is always the teacher's original order.
 *   - B, C, D… are shuffled with a *seeded* random generator: the same seed
 *     always produces the same "random" order. That's what keeps the answer
 *     key matching papers that were printed yesterday.
 *   - Options marked `lockOptions` keep their order (e.g. "all of the above").
 *   - Chronological-order and matching questions are shuffled in EVERY
 *     variant, A included (otherwise the answer would be "in the order
 *     shown"). The order shown is put on the copy as `shownOrder`.
 *
 * A variant is just a normal Test with a new order, so the whole print
 * system works on it unchanged.
 */
import { bankWords } from "@/lib/labelDiagram";
import { isTextBlock } from "@/lib/questions";
import { seedFromString } from "@/lib/storage/migrate";
import type {
  FillBlankQuestion,
  LabelDiagramQuestion,
  MatchingQuestion,
  MultipleChoiceQuestion,
  OrderQuestion,
  PictureMatchQuestion,
  Question,
  Test,
} from "@/lib/storage/types";

/** Variant names on the paper: Roman numerals, as Georgian schools write them (I = the original order). */
export const VARIANT_LABELS = ["I", "II", "III", "IV", "V", "VI"] as const;
export const MAX_VARIANTS = VARIANT_LABELS.length;

export type Variant = { label: string; test: Test };

/**
 * A tiny seeded random number generator ("mulberry32").
 * Each call returns a number in [0, 1); the sequence depends only on `seed`.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle: every order is equally likely. Returns a new array. */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** A text describing an arrangement, used to spot two identical variants. */
function arrangement(questions: Question[]): string {
  return questions
    .map((q) => {
      if (q.type === "multiple-choice") return `${q.id}(${q.options.map((o) => o.id).join(",")})`;
      if (q.type === "order" || q.type === "matching") return `${q.id}(${(q.shownOrder ?? []).join(",")})`;
      if (q.type === "fill-blank") return `${q.id}(${JSON.stringify([q.shownBank, q.shownChoices])})`;
      if (q.type === "label-diagram" || q.type === "picture-match") return `${q.id}(${(q.shownBank ?? []).join(",")})`;
      return q.id;
    })
    .join("|");
}

/**
 * A shuffled order that isn't the answer itself: e.g. events must not come
 * out already in the right order (a few tries; tiny lists may not manage).
 */
function shuffledIds(ids: string[], random: () => number): string[] {
  let order = shuffle(ids, random);
  for (let attempt = 0; attempt < 10 && ids.length > 1 && order.every((id, i) => id === ids[i]); attempt++) {
    order = shuffle(ids, random);
  }
  return order;
}

/** Chronological order / matching: decide the shuffled order shown on paper. */
export function arrangeItems(question: Question, random: () => number): Question {
  if (question.type === "order") {
    return { ...question, shownOrder: shuffledIds(question.items.map((i) => i.id), random) } satisfies OrderQuestion;
  }
  if (question.type === "matching") {
    // The right column: the pairs' right sides plus the extra items. Only the
    // pairs' order must not match the left column, so check that part.
    const pairIds = question.pairs.map((p) => p.id);
    let order = shuffle([...pairIds, ...question.extras.map((e) => e.id)], random);
    for (let attempt = 0; attempt < 10 && pairIds.length > 1 && order.filter((id) => pairIds.includes(id)).every((id, i) => id === pairIds[i]); attempt++) {
      order = shuffle(order, random);
    }
    return { ...question, shownOrder: order } satisfies MatchingQuestion;
  }
  if (question.type === "fill-blank") {
    // The word box and each gap's choices are shuffled; the gaps themselves stay in place.
    const bank = [...question.blanks.map((b) => b.word), ...question.extras.filter((w) => w.trim())];
    return {
      ...question,
      shownBank: shuffle(bank, random),
      shownChoices: question.blanks.map((b) => shuffle([b.word, ...(b.options ?? []).filter((o) => o.trim())], random)),
    } satisfies FillBlankQuestion;
  }
  if (question.type === "label-diagram") {
    // Only the word box is shuffled ("match" mode); the numbered labels never move.
    return question.mode === "match" ? ({ ...question, shownBank: shuffle(bankWords(question), random) } satisfies LabelDiagramQuestion) : question;
  }
  if (question.type === "picture-match") {
    const bank = [...question.pictures.map((p) => p.answer), ...question.extras].filter((w) => w.trim());
    return { ...question, shownBank: shuffle(bank, random) } satisfies PictureMatchQuestion;
  }
  return question;
}

/** One question exactly as variant A prints it (its items shuffled once, repeatably). Used by the question preview too. */
export function variantAQuestion(test: Test, question: Question): Question {
  return arrangeItems(question, seededRandom(test.variants.seed ^ seedFromString(question.id)));
}

/** Variant A: everything in the teacher's order, except order/matching items (shuffled once, repeatably). */
function arrangeOriginal(test: Test): Question[] {
  return test.questions.map((q) => variantAQuestion(test, q));
}

/**
 * Shuffles the questions, but reading texts and poems stay where they are:
 * only the questions between two texts are mixed, so "read the text and
 * answer" questions always stay right after their text.
 */
export function shuffleAroundTexts(questions: Question[], random: () => number): Question[] {
  const result: Question[] = [];
  let segment: Question[] = [];
  const flush = () => {
    result.push(...shuffle(segment, random));
    segment = [];
  };
  for (const question of questions) {
    if (isTextBlock(question)) {
      flush();
      result.push(question);
    } else segment.push(question);
  }
  flush();
  return result;
}

function shuffleOnce(test: Test, random: () => number): Question[] {
  const { shuffleQuestions, shuffleOptions } = test.variants;
  const ordered = shuffleQuestions ? shuffleAroundTexts(test.questions, random) : test.questions;
  return ordered.map((question) => {
    if (question.type !== "multiple-choice" || !shuffleOptions || question.lockOptions) return question;
    // The correct answer is stored by option id, so it stays correct after shuffling.
    return { ...question, options: shuffle(question.options, random) } satisfies MultipleChoiceQuestion;
  }).map((question) => arrangeItems(question, random));
}

/** How many variants print: the test's setting, at most `limit` (the plan's limit, see lib/plans). */
export function variantCount(test: Test, limit: number = MAX_VARIANTS): number {
  return Math.min(MAX_VARIANTS, Math.max(1, limit), Math.max(1, test.variants.count));
}

/**
 * All variants of a test: [A (original), B, C, …]. `limit` = the most the
 * teacher's plan allows; the test's own setting is never changed by it.
 */
export function buildVariants(test: Test, limit: number = MAX_VARIANTS): Variant[] {
  const original = arrangeOriginal(test);
  const variants: Variant[] = [{ label: VARIANT_LABELS[0], test: { ...test, questions: original } }];
  const seen = new Set([arrangement(original)]);

  for (let i = 1; i < variantCount(test, limit); i++) {
    // Each variant gets its own random sequence, derived from the test's seed.
    const random = seededRandom(test.variants.seed + i * 0x9e3779b9);
    let questions = shuffleOnce(test, random);
    // Small tests can shuffle into an order we already have: try again a few times.
    for (let attempt = 0; attempt < 30 && seen.has(arrangement(questions)); attempt++) {
      questions = shuffleOnce(test, random);
    }
    seen.add(arrangement(questions));
    variants.push({ label: VARIANT_LABELS[i], test: { ...test, questions } });
  }
  return variants;
}

/** A fresh random seed for the "Shuffle again" button. */
export function newSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
