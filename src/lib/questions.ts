/**
 * Small helper functions for questions. They are "pure": they only look at
 * what you pass in and return a new value — they never change the original.
 * Pure functions are the easiest code to test and to reason about.
 */
import { newId } from "@/lib/ids";
import { samplePedigree } from "@/lib/pedigree";
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
  "fill-blank",
];

/**
 * Blocks that are not questions (no number, no points): reading texts and
 * poems, section headings, listening blocks, speaking cards.
 */
const NOT_QUESTIONS: readonly QuestionType[] = ["passage", "poem", "section", "listening", "speaking"];
export function isTextBlock(question: Question): boolean {
  return NOT_QUESTIONS.includes(question.type);
}

/** A stable number from a text (for the first layout of a crossword / word search). */
function seedOf(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/**
 * Points of each section: the sum of the questions after it, up to the next
 * section. Returns { section id: points }.
 */
export function sectionPoints(questions: Question[]): Map<string, number> {
  const totals = new Map<string, number>();
  let current: string | null = null;
  for (const question of questions) {
    if (question.type === "section") {
      current = question.id;
      totals.set(current, 0);
    } else if (current && !isTextBlock(question)) {
      totals.set(current, (totals.get(current) ?? 0) + question.points);
    }
  }
  return totals;
}

/**
 * The printed number of each question (1, 2, 3…). Text blocks get none, so
 * "read the text and answer questions 1–5" stays right.
 */
export function questionNumbers(questions: Question[]): Map<string, number | null> {
  const numbers = new Map<string, number | null>();
  let next = 1;
  for (const question of questions) numbers.set(question.id, isTextBlock(question) ? null : next++);
  return numbers;
}

/** How many items the list-like questions may have. */
export const LIMITS = {
  matchingPairs: { min: 2, max: 8 },
  matchingExtras: 4,
  orderItems: { min: 2, max: 8 },
  timelineEvents: { min: 2, max: 8 },
  sourceParts: { min: 1, max: 6 },
  mapMarkers: 15,
  mapWidth: { min: 40, max: 100 },
  passageChars: 30_000,
  shortTextChars: 3_000,
  blanks: 40,
  tableRows: 15,
  mistakeItems: 10,
  sentenceParts: 8,
  essayLines: 60,
  guidePoints: 8,
  equations: 8,
  items: 12,
  cards: 12,
  pictures: 12,
  puzzleWords: 20,
  wordSearchSize: { min: 8, max: 15 },
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
    case "passage":
      return { ...base, type, points: 0, title: "", author: "", body: "", lineNumbers: true };
    case "poem":
      return { ...base, type, points: 0, title: "", author: "", body: "", lineNumbers: false };
    case "fill-blank":
      return { ...base, type, points: keep.points ?? 2, body: "", blanks: [], mode: "open", numbered: true, extras: [] };
    case "mark-words":
      return { ...base, type, points: keep.points ?? 2, body: "", marked: [] };
    case "grammar-table":
      return {
        ...base,
        type,
        points: keep.points ?? 3,
        wordTitle: "",
        answerTitle: "",
        rows: Array.from({ length: 3 }, () => ({ id: newId(), word: "", answer: "" })),
        bank: [],
      };
    case "find-mistake":
      return {
        ...base,
        type,
        points: keep.points ?? 2,
        items: Array.from({ length: 2 }, () => ({ id: newId(), sentence: "", mistake: null, correction: "" })),
      };
    case "sentence-analysis":
      return { ...base, type, points: keep.points ?? 3, sentence: "", parts: [] };
    case "essay":
      return { ...base, type, points: keep.points ?? 10, lines: 20, guide: [], length: "" };
    case "balance":
      return {
        ...base,
        type,
        points: keep.points ?? 2,
        equations: Array.from({ length: 2 }, () => ({ id: newId(), balanced: "" })),
      };
    case "section":
      return { ...base, type, points: 0, kind: "reading", title: "" };
    case "listening":
      return { ...base, type, points: 0, link: "", showQr: true, plays: 2, transcript: "" };
    case "speaking":
      return { ...base, type, points: 0, perPage: 4, cards: [{ id: newId(), title: "", prompts: "" }] };
    case "transformation":
      return {
        ...base,
        type,
        points: keep.points ?? 4,
        items: Array.from({ length: 2 }, () => ({ id: newId(), original: "", keyWord: "", before: "", after: "", answer: "" })),
      };
    case "word-formation":
      return { ...base, type, points: keep.points ?? 4, items: Array.from({ length: 3 }, () => ({ id: newId(), sentence: "", gap: null, root: "" })) };
    case "picture-match":
      return { ...base, type, points: keep.points ?? 4, pictures: [], extras: [], wordBank: true };
    case "odd-one-out":
      return { ...base, type, points: keep.points ?? 3, rows: Array.from({ length: 3 }, () => ({ id: newId(), words: ["", "", "", ""], odd: null })) };
    case "crossword":
      return { ...base, type, points: keep.points ?? 5, entries: Array.from({ length: 4 }, () => ({ id: newId(), word: "", clue: "" })), seed: seedOf(base.id) };
    case "word-search":
      return { ...base, type, points: keep.points ?? 4, words: [], size: 10, allDirections: false, seed: seedOf(base.id) };
    case "given-find":
      return { ...base, type, points: keep.points ?? 3, lines: DEFAULT_GIVEN_FIND_LINES, given: [], find: [], solution: [], answer: [] };
    case "label-diagram":
      return { ...base, type, points: keep.points ?? 4, picture: null, pictureWidth: 100, labels: [], mode: "boxes", wordBank: false, extras: [] };
    case "punnett":
      return { ...base, type, points: keep.points ?? 3, mother: "Aa", father: "Aa", shown: [], blankGametes: false, showParents: true, askRatios: true, traits: {} };
    case "pedigree":
      return { ...base, type, points: keep.points ?? 3, ...samplePedigree(newId), legend: true, numbers: true };
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
