/**
 * Small helpers to write the sample tests (src/samples/<subject>.ts) as
 * readable data. Every id is fixed ("sample-math-q3-o1"), so a sample is
 * the same every time it is opened and its variants never change.
 */
import type { RichText, RichTextSegment, TextMark } from "@/lib/richText";
import { normalizeTest } from "@/lib/storage/migrate";
import { DEFAULT_PRINT_OPTIONS, DEFAULT_VARIANTS, type ChoiceOption, type Question, type Test } from "@/lib/storage/types";
import type { WordRef } from "@/lib/words";
import type { SubjectId } from "@/subjects/ids";

export type Part = string | RichTextSegment;

/** A formula (LaTeX), e.g. m("\\frac{3}{4}"). */
export const m = (latex: string): RichTextSegment => ({ type: "math", latex });
/** A chemistry formula (mhchem), e.g. ce("H2SO4"). */
export const ce = (formula: string): RichTextSegment => m(`\\ce{${formula}}`);
const marked = (marks: TextMark[]) => (text: string): RichTextSegment => ({ type: "text", text, marks });
export const italic = marked(["italic"]);
export const bold = marked(["bold"]);

/** Text and formulas → RichText: rt("გამოთვალეთ: ", m("\\frac{1}{2}")). */
export const rt = (...parts: Part[]): RichText => parts.map((p) => (typeof p === "string" ? { type: "text", text: p } : p));

type Extra = Partial<Pick<Question, "tip" | "images" | "grid">>;

/** The fields every question has. */
export const base = (id: string, points: number, text: RichText, extra: Extra = {}) => ({ id, points, text, images: [], grid: null, ...extra });

const asRich = (value: RichText | string) => (typeof value === "string" ? rt(value) : value);
export const choices = (id: string, texts: (RichText | string)[]): ChoiceOption[] => texts.map((text, i) => ({ id: `${id}-o${i + 1}`, text: asRich(text) }));

export function mc(id: string, points: number, text: RichText, options: (RichText | string)[], correct: number, extra: Extra & { lock?: boolean } = {}): Question {
  const { lock = false, ...rest } = extra;
  const opts = choices(id, options);
  return { ...base(id, points, text, rest), type: "multiple-choice", options: opts, correctOptionId: opts[correct].id, lockOptions: lock };
}

export const tf = (id: string, points: number, text: RichText, correct: boolean | "not-given", extra: Extra & { notGiven?: boolean } = {}): Question => {
  const { notGiven, ...rest } = extra;
  return { ...base(id, points, text, rest), type: "true-false", correct, ...(notGiven ? { notGiven: true } : {}) };
};

export const short = (id: string, points: number, text: RichText, answer: RichText | string, extra: Extra = {}): Question => ({
  ...base(id, points, text, extra),
  type: "short-answer",
  answer: asRich(answer),
});

export const open = (id: string, points: number, text: RichText, lines: number, extra: Extra = {}): Question => ({ ...base(id, points, text, extra), type: "open-answer", lines });

export function matching(
  id: string,
  points: number,
  text: RichText,
  titles: [string, string],
  pairs: [RichText | string, RichText | string][],
  extras: (RichText | string)[],
  extra: Extra = {},
): Question {
  return {
    ...base(id, points, text, extra),
    type: "matching",
    leftTitle: titles[0],
    rightTitle: titles[1],
    pairs: pairs.map(([left, right], i) => ({ id: `${id}-p${i + 1}`, left: asRich(left), right: asRich(right) })),
    extras: choices(`${id}-x`, extras),
  };
}

/** A blank: the word (its 1st occurrence unless `occurrence` says otherwise), an optional hint and wrong choices. */
export type Blank = { word: string; occurrence?: number; hint?: string; options?: string[] };

export function fillBlank(
  id: string,
  points: number,
  text: RichText,
  body: string,
  blanks: Blank[],
  settings: { mode?: "open" | "bank" | "choice"; numbered?: boolean; extras?: string[] } = {},
  extra: Extra = {},
): Question {
  return {
    ...base(id, points, text, extra),
    type: "fill-blank",
    body,
    blanks: blanks.map((b) => ({ word: b.word, occurrence: b.occurrence ?? 0, hint: b.hint ?? "", ...(b.options ? { options: b.options } : {}) })),
    mode: settings.mode ?? "open",
    numbered: settings.numbered ?? true,
    extras: settings.extras ?? [],
  };
}

export const order = (id: string, points: number, text: RichText, items: (RichText | string)[], extra: Extra = {}): Question => ({
  ...base(id, points, text, extra),
  type: "order",
  items: choices(id, items),
});

/** A word in a sentence: its first occurrence (or the n-th). */
export const word = (text: string, occurrence = 0): WordRef => ({ word: text, occurrence });

/** Counts ids inside one sample: next("q") → "sample-bio-q-1", "sample-bio-q-2"… */
export function idMaker(prefix: string) {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Today, as "YYYY-MM-DD" (samples show a current date in the header). */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const SAMPLE_PREFIX = "sample-";
/** A copy's title: the sample's without "ნიმუში — " / "Sample test — " in front. */
export const templateTitle = (title: string) => title.replace(/^(ნიმუში|Sample test)\s*—\s*/, "");
/** "sample-math" → true. Sample ids never collide with real ones (those are UUIDs). */
export const isSampleId = (id: string) => id.startsWith(SAMPLE_PREFIX);
const SAMPLE_TIME = "2026-11-14T08:00:00.000Z";

/** A complete, valid test (checked by normalizeTest) with the fixed sample id "sample-<subject>". */
export function sampleTest(fields: {
  subjectId: SubjectId;
  title: string;
  subject: string;
  grade: string;
  instructions: string;
  timeLimitMinutes: number;
  questions: Question[];
  labelStyle?: Test["labelStyle"];
  level?: Test["level"];
  printOptions?: Partial<Test["printOptions"]>;
  variants?: Partial<Test["variants"]>;
}): Test {
  const { printOptions, variants, ...rest } = fields;
  const test = normalizeTest({
    id: `${SAMPLE_PREFIX}${fields.subjectId}`,
    schoolName: fields.subjectId === "english" ? "Sample Public School No. 1" : "სანიმუშო საჯარო სკოლა №1",
    level: "",
    labelStyle: "georgian",
    date: today(),
    folder: "",
    ...rest,
    printOptions: { ...DEFAULT_PRINT_OPTIONS, ...printOptions },
    variants: { ...DEFAULT_VARIANTS, seed: 20261114, ...variants },
    createdAt: SAMPLE_TIME,
    updatedAt: SAMPLE_TIME,
  });
  if (!test) throw new Error(`Broken sample: ${fields.subjectId}`);
  return test;
}
