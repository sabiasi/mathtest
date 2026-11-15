/**
 * The format the AI must answer in ("wire format"): deliberately simple and
 * flat, so one strict JSON schema covers every question type. Our own
 * question format is built from it in convert.ts — the AI never writes our
 * stored data directly.
 *
 * Text fields may contain formulas between single dollar signs:
 *   "ამოხსენით $x^2-5x+6=0$"      a LaTeX formula
 *   "რა არის $\ce{H2SO4}$?"        a chemistry formula (mhchem)
 * Fields a question type doesn't use are empty ("" / [] / 0 / false).
 */
import { AI_TYPES, type AiType } from "./request";

export type AiItem = {
  type: AiType;
  /** The question / instruction. */
  text: string;
  points: number;
  /** multiple-choice: 2–6 answers; `correct` = index of the right one (0 = first). */
  options: string[];
  correct: number;
  /** true-false. */
  is_true: boolean;
  /** short-answer: the expected answer. given-find: the final answer. */
  answer: string;
  /** open-answer / given-find: writing lines for the student. */
  lines: number;
  /** matching: pairs that belong together; `extras` = wrong right-column items. */
  pairs: { left: string; right: string }[];
  extras: string[];
  /** order: the items in the CORRECT order. */
  items: string[];
  /** fill-blank: the full text, and the words (exactly as in the text) to blank out. */
  body: string;
  blanks: string[];
  /** given-find (physics / chemistry problems). */
  given: string;
  find: string;
  solution: string;
  /** balance: balanced equations typed like "2H2 + O2 -> 2H2O". */
  equations: string[];
};

const text = { type: "string" } as const;
const list = { type: "array", items: text } as const;

const ITEM_PROPERTIES = {
  type: { type: "string", enum: [...AI_TYPES] },
  text,
  points: { type: "number" },
  options: list,
  correct: { type: "integer" },
  is_true: { type: "boolean" },
  answer: text,
  lines: { type: "integer" },
  pairs: { type: "array", items: { type: "object", properties: { left: text, right: text }, required: ["left", "right"], additionalProperties: false } },
  extras: list,
  items: list,
  body: text,
  blanks: list,
  given: text,
  find: text,
  solution: text,
  equations: list,
} as const;

/** The JSON schema sent to Claude (structured output): every field required, nothing extra allowed. */
export const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: { type: "object", properties: ITEM_PROPERTIES, required: Object.keys(ITEM_PROPERTIES), additionalProperties: false },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

const str = (value: unknown) => (typeof value === "string" ? value : "");
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []);

/**
 * Reads whatever came back into AiItems, without trusting it: wrong types
 * become empty values, unknown question types are skipped. (With structured
 * output the shape is already right; mock mode and tests go through here too.)
 */
export function readItems(raw: unknown): AiItem[] {
  const questions = raw && typeof raw === "object" ? (raw as { questions?: unknown }).questions : null;
  if (!Array.isArray(questions)) return [];
  const items: AiItem[] = [];
  for (const entry of questions) {
    if (!entry || typeof entry !== "object") continue;
    const q = entry as Record<string, unknown>;
    if (!AI_TYPES.includes(q.type as AiType)) continue;
    items.push({
      type: q.type as AiType,
      text: str(q.text),
      points: typeof q.points === "number" ? q.points : 1,
      options: strings(q.options),
      correct: typeof q.correct === "number" ? q.correct : -1,
      is_true: q.is_true === true,
      answer: str(q.answer),
      lines: typeof q.lines === "number" ? q.lines : 0,
      pairs: Array.isArray(q.pairs)
        ? q.pairs.flatMap((pair) => (pair && typeof pair === "object" ? [{ left: str((pair as { left?: unknown }).left), right: str((pair as { right?: unknown }).right) }] : []))
        : [],
      extras: strings(q.extras),
      items: strings(q.items),
      body: str(q.body),
      blanks: strings(q.blanks),
      given: str(q.given),
      find: str(q.find),
      solution: str(q.solution),
      equations: strings(q.equations),
    });
  }
  return items;
}

/** A blank item of one type, for mock mode and tests. */
export const emptyItem = (type: AiType, textValue = ""): AiItem => ({
  type, text: textValue, points: 1, options: [], correct: 0, is_true: false, answer: "", lines: 0, pairs: [], extras: [], items: [], body: "", blanks: [], given: "", find: "", solution: "", equations: [],
});
