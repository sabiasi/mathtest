/**
 * Small helper functions for questions. They are "pure": they only look at
 * what you pass in and return a new value — they never change the original.
 * Pure functions are the easiest code to test and to reason about.
 */
import { newId } from "@/lib/ids";
import type {
  ChoiceOption,
  LabelStyle,
  Question,
  QuestionType,
} from "@/lib/storage/types";

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const MAX_LINES = 30;
export const DEFAULT_LINES = 5;

export const QUESTION_TYPES: QuestionType[] = [
  "multiple-choice",
  "true-false",
  "short-answer",
  "open-answer",
];

function emptyOptions(count: number): ChoiceOption[] {
  return Array.from({ length: count }, () => ({ id: newId(), text: "" }));
}

/**
 * Builds the type-specific part of a question. `keep` carries over the
 * shared fields (text, points) when a teacher switches a question's type.
 */
export function createQuestion(
  type: QuestionType,
  keep: { id?: string; text?: string; points?: number } = {},
): Question {
  const base = { id: keep.id ?? newId(), text: keep.text ?? "", points: keep.points ?? 1 };
  switch (type) {
    case "multiple-choice":
      return { ...base, type, options: emptyOptions(4), correctOptionId: null };
    case "true-false":
      return { ...base, type, correct: null };
    case "short-answer":
      return { ...base, type, answer: "" };
    case "open-answer":
      return { ...base, type, points: keep.points ?? 3, lines: DEFAULT_LINES };
  }
}

/** Switches a question to another type, keeping its id, text and points. */
export function changeQuestionType(question: Question, type: QuestionType): Question {
  if (question.type === type) return question;
  return createQuestion(type, question);
}

/** A copy with fresh ids (also for the options), so the copy is independent. */
export function duplicateQuestion(question: Question): Question {
  if (question.type === "multiple-choice") {
    const options = question.options.map((option) => ({ ...option, id: newId() }));
    const correctIndex = question.options.findIndex((o) => o.id === question.correctOptionId);
    return {
      ...question,
      id: newId(),
      options,
      correctOptionId: correctIndex >= 0 ? options[correctIndex].id : null,
    };
  }
  return { ...question, id: newId() };
}

/**
 * The total number of points in a test.
 * Example: questions worth 2, 3 and 1.5 points → 6.5
 */
export function totalPoints(questions: Question[]): number {
  return questions.reduce((sum, question) => sum + question.points, 0);
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

/** Shows points nicely: 2 → "2", 1.5 → "1.5". */
export function formatPoints(points: number): string {
  return String(Math.round(points * 100) / 100);
}
