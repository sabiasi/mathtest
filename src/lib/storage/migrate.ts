/**
 * "Migration": upgrading saved data to the current shape.
 *
 * Tests saved by an older version of MathTest may be missing fields that
 * were added later (e.g. `schoolName`). Instead of crashing, every test we
 * read from storage passes through `normalizeTest`, which fills in safe
 * defaults. Unknown or broken questions are dropped rather than crashing.
 */
import { DEFAULT_LINES, MAX_LINES, MAX_OPTIONS } from "@/lib/questions";
import type { ChoiceOption, LabelStyle, Question, Test } from "./types";

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
    .map((o) => ({ id: o.id as string, text: str(o.text) }));
}

function normalizeQuestion(raw: unknown): Question | null {
  if (!isObject(raw) || typeof raw.id !== "string") return null;
  const base = { id: raw.id, text: str(raw.text), points: Math.max(0, num(raw.points, 1)) };

  switch (raw.type) {
    case "multiple-choice": {
      const options = normalizeOptions(raw.options);
      const correct = options.some((o) => o.id === raw.correctOptionId)
        ? (raw.correctOptionId as string)
        : null;
      return { ...base, type: "multiple-choice", options, correctOptionId: correct };
    }
    case "true-false":
      return {
        ...base,
        type: "true-false",
        correct: typeof raw.correct === "boolean" ? raw.correct : null,
      };
    case "short-answer":
      return { ...base, type: "short-answer", answer: str(raw.answer) };
    case "open-answer": {
      const lines = Math.min(MAX_LINES, Math.max(0, Math.round(num(raw.lines, DEFAULT_LINES))));
      return { ...base, type: "open-answer", lines };
    }
    default:
      return null;
  }
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
    createdAt: str(raw.createdAt, now),
    updatedAt: str(raw.updatedAt, now),
  };
}
