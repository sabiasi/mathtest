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
/** Height of a Given / Find / Solution frame, in writing lines. */
export const DEFAULT_GIVEN_FIND_LINES = 7;
export const MIN_GIVEN_FIND_LINES = 4;

/** The common question types: every subject offers these (see src/subjects). */
export const QUESTION_TYPES: readonly QuestionType[] = [
  "multiple-choice",
  "true-false",
  "short-answer",
  "open-answer",
  "matching",
];

/** How many items the list-like questions may have. */
export const LIMITS = {
  matchingPairs: { min: 2, max: 8 },
  matchingExtras: 4,
  orderItems: { min: 2, max: 8 },
  timelineEvents: { min: 2, max: 8 },
  sourceParts: { min: 1, max: 6 },
  mapMarkers: 15,
  mapWidth: { min: 40, max: 100 },
};

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
    case "matching":
      return {
        ...base,
        type,
        points: keep.points ?? 3,
        leftTitle: "",
        rightTitle: "",
        pairs: Array.from({ length: 3 }, () => ({ id: newId(), left: [], right: [] })),
        extras: [],
      };
    case "order":
      return { ...base, type, points: keep.points ?? 2, items: emptyOptions(4) };
    case "timeline":
      return {
        ...base,
        type,
        points: keep.points ?? 2,
        events: Array.from({ length: 4 }, () => ({ id: newId(), date: [], label: [], hide: "label" as const })),
      };
    case "source":
      return {
        ...base,
        type,
        points: keep.points ?? 4,
        source: [],
        sourceCaption: [],
        parts: [{ id: newId(), text: [], lines: 3, answer: [] }],
      };
    case "map":
      return { ...base, type, points: keep.points ?? 3, map: null, mapWidth: 80, markers: [], wordBank: false };
    case "given-find":
      return { ...base, type, points: keep.points ?? 3, lines: DEFAULT_GIVEN_FIND_LINES, given: [], find: [], solution: [], answer: [] };
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
 */
export function totalPoints(questions: Question[]): number {
  let total = 0;
  for (const question of questions) {
    total += question.points;
  }
  return total;
}

// Enough letters for the longest lists (matching: 8 pairs + 4 extras).
const LABELS: Record<LabelStyle, string> = {
  latin: "ABCDEFGHIJKLMNOP",
  georgian: "აბგდევზთიკლმნოპრ",
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
