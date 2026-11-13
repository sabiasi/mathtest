/**
 * "Migration": upgrading saved data to the current shape.
 *
 * Tests saved by an older version of MathTest may be missing fields that
 * were added later (e.g. `schoolName`). Instead of crashing, every test we
 * read from storage passes through `normalizeTest`, which fills in safe
 * defaults. Unknown or broken questions are dropped rather than crashing.
 */
import { DEFAULT_LINES, GRID_LIMITS, MAX_LINES, MAX_OPTIONS } from "@/lib/questions";
import { normalizeRichText } from "@/lib/richText";
import { DEFAULT_SUBJECT, isSubjectId, subjectFromText } from "@/subjects/ids";
import {
  type AnswerGrid,
  type QuestionImage,
  DEFAULT_PRINT_OPTIONS,
  DEFAULT_VARIANTS,
  type ChoiceOption,
  type LabelStyle,
  type PrintOptions,
  type Question,
  type Test,
  type VariantSettings,
} from "./types";

type Loose = Record<string, unknown>;

const isObject = (v: unknown): v is Loose => typeof v === "object" && v !== null;
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function normalizeOptions(value: unknown): ChoiceOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .filter((o) => typeof o.id === "string")
    .slice(0, MAX_OPTIONS)
    .map((o) => ({ id: o.id as string, text: normalizeRichText(o.text) }));
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function normalizeImages(value: unknown): QuestionImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .filter((i) => typeof i.id === "string" && typeof i.imageId === "string")
    .map((i) => ({
      id: i.id as string,
      imageId: i.imageId as string,
      width: Math.max(1, num(i.width, 400)),
      height: Math.max(1, num(i.height, 300)),
      widthPercent: clamp(Math.round(num(i.widthPercent, 50)), 10, 100),
      position: i.position === "right" ? "right" : "above",
    }));
}

function normalizeGrid(value: unknown): AnswerGrid | null {
  if (!isObject(value)) return null;
  return {
    kind: value.kind === "coordinates" ? "coordinates" : "squares",
    cols: clamp(Math.round(num(value.cols, 20)), GRID_LIMITS.minCols, GRID_LIMITS.maxCols),
    rows: clamp(Math.round(num(value.rows, 12)), GRID_LIMITS.minRows, GRID_LIMITS.maxRows),
  };
}

function normalizeQuestion(raw: unknown): Question | null {
  if (!isObject(raw) || typeof raw.id !== "string") return null;
  // Phase 1 saved text as a plain string; normalizeRichText upgrades it.
  const base = {
    id: raw.id,
    text: normalizeRichText(raw.text),
    points: Math.max(0, num(raw.points, 1)),
    images: normalizeImages(raw.images),
    grid: normalizeGrid(raw.grid),
  };

  switch (raw.type) {
    case "multiple-choice": {
      const options = normalizeOptions(raw.options);
      const correct = options.some((o) => o.id === raw.correctOptionId)
        ? (raw.correctOptionId as string)
        : null;
      return { ...base, type: "multiple-choice", options, correctOptionId: correct, lockOptions: raw.lockOptions === true };
    }
    case "true-false":
      return {
        ...base,
        type: "true-false",
        correct: typeof raw.correct === "boolean" ? raw.correct : null,
      };
    case "short-answer":
      return { ...base, type: "short-answer", answer: normalizeRichText(raw.answer) };
    case "open-answer": {
      const lines = Math.min(MAX_LINES, Math.max(0, Math.round(num(raw.lines, DEFAULT_LINES))));
      return { ...base, type: "open-answer", lines };
    }
    default:
      return null;
  }
}

function normalizePrintOptions(raw: unknown): PrintOptions {
  const o = isObject(raw) ? raw : {};
  return {
    fontSize: o.fontSize === "large" ? "large" : DEFAULT_PRINT_OPTIONS.fontSize,
    showPoints: typeof o.showPoints === "boolean" ? o.showPoints : DEFAULT_PRINT_OPTIONS.showPoints,
    columns: o.columns === 2 ? 2 : DEFAULT_PRINT_OPTIONS.columns,
  };
}

/** A stable number made from a text (the test id), used as the default shuffle seed. */
export function seedFromString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

function normalizeVariants(raw: unknown, id: string): VariantSettings {
  const o = isObject(raw) ? raw : {};
  const count = typeof o.count === "number" ? Math.round(o.count) : DEFAULT_VARIANTS.count;
  return {
    count: Math.min(6, Math.max(1, count)),
    shuffleQuestions: typeof o.shuffleQuestions === "boolean" ? o.shuffleQuestions : DEFAULT_VARIANTS.shuffleQuestions,
    shuffleOptions: typeof o.shuffleOptions === "boolean" ? o.shuffleOptions : DEFAULT_VARIANTS.shuffleOptions,
    seed: typeof o.seed === "number" && Number.isFinite(o.seed) ? o.seed >>> 0 : seedFromString(id),
    duplex: o.duplex === true,
  };
}

/** Returns a complete, valid Test, or null if `raw` isn't a test at all. */
export function normalizeTest(raw: unknown): Test | null {
  if (!isObject(raw) || typeof raw.id !== "string") return null;
  const now = new Date().toISOString();
  const labelStyle: LabelStyle = raw.labelStyle === "latin" ? "latin" : "georgian";
  const questions = Array.isArray(raw.questions)
    ? raw.questions.map(normalizeQuestion).filter((q): q is Question => q !== null)
    : [];

  return {
    id: raw.id,
    schoolName: str(raw.schoolName),
    title: str(raw.title),
    // Tests from before subjects existed: guess from the printed name, else math.
    subjectId: isSubjectId(raw.subjectId) ? raw.subjectId : (subjectFromText(str(raw.subject)) ?? DEFAULT_SUBJECT),
    subject: str(raw.subject),
    grade: str(raw.grade),
    date: str(raw.date),
    timeLimitMinutes:
      typeof raw.timeLimitMinutes === "number" && raw.timeLimitMinutes > 0
        ? raw.timeLimitMinutes
        : null,
    instructions: str(raw.instructions),
    labelStyle,
    questions,
    printOptions: normalizePrintOptions(raw.printOptions),
    variants: normalizeVariants(raw.variants, raw.id),
    createdAt: str(raw.createdAt, now),
    updatedAt: str(raw.updatedAt, now),
  };
}
