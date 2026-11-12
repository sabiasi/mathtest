/**
 * Small helper functions for questions. They are "pure": they only look at
 * what you pass in and return a new value — they never change the original.
 * Pure functions are the easiest code to test and to reason about.
 */
import { newId } from "@/lib/ids";
import { isRichTextEmpty } from "@/lib/richText";
import type {
  ChoiceOption,
  LabelStyle,
  MultipleChoiceQuestion,
  Question,
  QuestionType,
} from "@/lib/storage/types";

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const MAX_LINES = 30;
export const DEFAULT_LINES = 5;

/** Grid limits: 35 squares of 5 mm fill the 178 mm printable width. */
export const GRID_LIMITS = { minCols: 4, maxCols: 34, minRows: 2, maxRows: 40 };
export const DEFAULT_GRID = { cols: 20, rows: 12 };

export const QUESTION_TYPES: QuestionType[] = [
  "multiple-choice",
  "true-false",
  "short-answer",
  "open-answer",
];

function emptyOptions(count: number): ChoiceOption[] {
  return Array.from({ length: count }, () => ({ id: newId(), text: [] }));
}

/**
 * Builds the type-specific part of a question. `keep` carries over the
 * shared fields (text, points) when a teacher switches a question's type.
 */
export function createQuestion(
  type: QuestionType,
  keep: Partial<Pick<Question, "id" | "text" | "points" | "images" | "grid">> = {},
): Question {
  const base = {
    id: keep.id ?? newId(),
    text: keep.text ?? [],
    points: keep.points ?? 1,
    images: keep.images ?? [],
    grid: keep.grid ?? null,
  };
  switch (type) {
    case "multiple-choice":
      return { ...base, type, options: emptyOptions(4), correctOptionId: null, lockOptions: false };
    case "true-false":
      return { ...base, type, correct: null };
    case "short-answer":
      return { ...base, type, answer: [] };
    case "open-answer":
      return { ...base, type, points: keep.points ?? 3, lines: DEFAULT_LINES };
  }
}

/** Switches a question to another type, keeping its id, text, points, images and grid. */
export function changeQuestionType(question: Question, type: QuestionType): Question {
  if (question.type === type) return question;
  return createQuestion(type, question);
}

/** A copy with fresh ids (also for the options), so the copy is independent. */
export function duplicateQuestion(question: Question): Question {
  // The copy points to the same stored pictures, with its own placement ids.
  const images = question.images.map((image) => ({ ...image, id: newId() }));
  if (question.type === "multiple-choice") {
    const options = question.options.map((option) => ({ ...option, id: newId() }));
    const correctIndex = question.options.findIndex((o) => o.id === question.correctOptionId);
    return {
      ...question,
      id: newId(),
      images,
      options,
      correctOptionId: correctIndex >= 0 ? options[correctIndex].id : null,
    };
  }
  return { ...question, id: newId(), images };
}

/**
 * The total number of points in a test.
 * Example: questions worth 2, 3 and 1.5 points → 6.5
 *
 * ✏️  PRACTICE TASK 1 — write this function yourself.
 * Right now it always returns 0, so the editor shows "სულ: 0 ქულა".
 *
 * Hints:
 * - Each question has a `points` number: question.points
 * - In Python you might write:
 *       total = 0
 *       for question in questions:
 *           total += question.points
 *       return total
 * - TypeScript looks almost the same:
 *       let total = 0;
 *       for (const question of questions) { ... }
 * - Check your work: `npm test` → the "totalPoints" tests turn green.
 */
export function totalPoints(questions: Question[]): number {
  // TODO(you): add up the points of every question.
  return 0;
}

const LABELS: Record<LabelStyle, string> = {
  latin: "ABCDEF",
  georgian: "აბგდევ",
};

/**
 * The label for an option at position `index` (0 = first).
 * optionLabel(0, "latin") → "A", optionLabel(2, "georgian") → "გ"
 */
export function optionLabel(index: number, style: LabelStyle): string {
  return LABELS[style][index] ?? "?";
}

/** Options the teacher left empty are not printed (and don't use up a letter). */
export function visibleOptions(question: MultipleChoiceQuestion): ChoiceOption[] {
  return question.options.filter((option) => !isRichTextEmpty(option.text));
}

/** The printed letter of the correct option ("გ"), or null if none is marked. */
export function correctOptionLabel(question: MultipleChoiceQuestion, style: LabelStyle): string | null {
  const index = visibleOptions(question).findIndex((o) => o.id === question.correctOptionId);
  return index >= 0 ? optionLabel(index, style) : null;
}

/** Shows points nicely: 2 → "2", 1.5 → "1.5". */
export function formatPoints(points: number): string {
  return String(Math.round(points * 100) / 100);
}
