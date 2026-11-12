/**
 * Variants: the same test with questions and/or answer options in a
 * different order, so neighbours can't copy from each other.
 *
 *   - Variant A is always the teacher's original order.
 *   - B, C, D… are shuffled with a *seeded* random generator: the same seed
 *     always produces the same "random" order. That's what keeps the answer
 *     key matching papers that were printed yesterday.
 *   - Options marked `lockOptions` keep their order (e.g. "all of the above").
 *
 * A variant is just a normal Test with a new order, so the whole print
 * system works on it unchanged.
 */
import type { MultipleChoiceQuestion, Question, Test } from "@/lib/storage/types";

export const VARIANT_LABELS = ["A", "B", "C", "D", "E", "F"] as const;
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
    .map((q) => (q.type === "multiple-choice" ? `${q.id}(${q.options.map((o) => o.id).join(",")})` : q.id))
    .join("|");
}

function shuffleOnce(test: Test, random: () => number): Question[] {
  const { shuffleQuestions, shuffleOptions } = test.variants;
  const ordered = shuffleQuestions ? shuffle(test.questions, random) : test.questions;
  return ordered.map((question) => {
    if (question.type !== "multiple-choice" || !shuffleOptions || question.lockOptions) return question;
    // The correct answer is stored by option id, so it stays correct after shuffling.
    return { ...question, options: shuffle(question.options, random) } satisfies MultipleChoiceQuestion;
  });
}

export function variantCount(test: Test): number {
  return Math.min(MAX_VARIANTS, Math.max(1, test.variants.count));
}

/** All variants of a test: [A (original), B, C, …]. */
export function buildVariants(test: Test): Variant[] {
  const variants: Variant[] = [{ label: VARIANT_LABELS[0], test }];
  const seen = new Set([arrangement(test.questions)]);

  for (let i = 1; i < variantCount(test); i++) {
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
