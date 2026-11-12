/**
 * The shapes of MathTest's data.
 *
 * A "type" in TypeScript is a description of what an object looks like.
 * It doesn't exist when the app runs — it only helps the editor and the
 * compiler catch mistakes (like a typo in a field name) before you run anything.
 */

/** The kinds of questions MathTest will support (built in a later phase). */
export type QuestionType =
  | "multiple-choice"
  | "true-false"
  | "short-answer"
  | "open-answer"
  | "fill-in-blank"
  | "matching";

/** One question. More fields (text, options, correct answer…) come in later phases. */
export interface Question {
  id: string;
  type: QuestionType;
  points: number;
}

/** One test / quiz / exam. */
export interface Test {
  id: string;
  title: string;
  subject: string;
  grade: string;
  /** Exam date as "YYYY-MM-DD", or "" when not set. */
  date: string;
  instructions: string;
  questions: Question[];
  /** ISO timestamps, e.g. "2026-11-12T15:30:00.000Z". */
  createdAt: string;
  updatedAt: string;
}
