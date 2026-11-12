/**
 * The shapes of MathTest's data.
 *
 * A "type" in TypeScript is a description of what an object looks like.
 * It doesn't exist when the app runs — it only helps the editor and the
 * compiler catch mistakes (like a typo in a field name) before you run anything.
 */

import type { RichText } from "@/lib/richText";

/** How multiple-choice options are labelled: A, B, C… or ა, ბ, გ… */
export type LabelStyle = "latin" | "georgian";

/**
 * An image placed in a question. The picture itself lives in the browser's
 * IndexedDB (see lib/images/imageStore.ts); here we only keep its id and how
 * it is shown.
 */
export interface QuestionImage {
  /** This placement's own id (the same picture can appear in two questions). */
  id: string;
  /** The stored picture. */
  imageId: string;
  /** Natural size in pixels — used for the aspect ratio before the picture loads. */
  width: number;
  height: number;
  /** Width as a percentage of the question's width (10–100). */
  widthPercent: number;
  /** Above the question text, or to the right of it. */
  position: "above" | "right";
}

/** Graph paper or a coordinate plane printed as an answer area. 5 mm squares. */
export interface AnswerGrid {
  kind: "squares" | "coordinates";
  cols: number;
  rows: number;
}

/** Fields every question has, whatever its type. */
interface QuestionBase {
  id: string;
  /** Can be a half point, e.g. 1.5. */
  points: number;
  /** The question: text mixed with formulas. */
  text: RichText;
  images: QuestionImage[];
  /** An optional grid answer area under the question. */
  grid: AnswerGrid | null;
}

export interface ChoiceOption {
  id: string;
  text: RichText;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: "multiple-choice";
  /** 2 to 6 options. */
  options: ChoiceOption[];
  /** The id of the correct option, or null if not marked yet. */
  correctOptionId: string | null;
  /** Keep the options in this order in every variant (e.g. "all of the above" last). */
  lockOptions: boolean;
}

export interface TrueFalseQuestion extends QuestionBase {
  type: "true-false";
  /** true = the statement is true; null = not marked yet. */
  correct: boolean | null;
}

export interface ShortAnswerQuestion extends QuestionBase {
  type: "short-answer";
  /** The expected answer, shown only on the answer key. Optional. */
  answer: RichText;
}

export interface OpenAnswerQuestion extends QuestionBase {
  type: "open-answer";
  /** How many blank lines students get for their work. */
  lines: number;
}

/**
 * A question is exactly ONE of these. The `type` field tells which one —
 * TypeScript calls this a "discriminated union".
 */
export type Question =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | ShortAnswerQuestion
  | OpenAnswerQuestion;

export type QuestionType = Question["type"];

/** How the test is printed. Saved with the test so it's remembered. */
export interface PrintOptions {
  fontSize: "normal" | "large";
  showPoints: boolean;
  columns: 1 | 2;
}

export const DEFAULT_PRINT_OPTIONS: PrintOptions = { fontSize: "normal", showPoints: true, columns: 1 };

/**
 * Variants A, B, C… of the same test with questions / options in a different
 * order. `seed` makes the shuffle repeatable: the same seed always gives the
 * same variants, so answer keys keep matching papers that were already printed.
 */
export interface VariantSettings {
  /** 1 = no variants. Up to 6 (A–F). */
  count: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  seed: number;
  /** When printing all variants together: start each one on a new sheet of paper. */
  duplex: boolean;
}

export const DEFAULT_VARIANTS: Omit<VariantSettings, "seed"> = {
  count: 1,
  shuffleQuestions: true,
  shuffleOptions: true,
  duplex: false,
};

/** One test / quiz / exam. */
export interface Test {
  id: string;
  schoolName: string;
  title: string;
  subject: string;
  grade: string;
  /** Exam date as "YYYY-MM-DD", or "" when not set. */
  date: string;
  /** Time allowed in minutes, or null when not set. */
  timeLimitMinutes: number | null;
  instructions: string;
  labelStyle: LabelStyle;
  questions: Question[];
  printOptions: PrintOptions;
  variants: VariantSettings;
  /** ISO timestamps, e.g. "2026-11-12T15:30:00.000Z". */
  createdAt: string;
  updatedAt: string;
}
