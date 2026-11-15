/**
 * From the AI's answer (wire.ts) to OUR questions — carefully.
 *
 * Nothing the AI wrote is saved as it is. Every item is rebuilt with
 * `createQuestion` (so it has all the fields our editor expects), small
 * mistakes are repaired, and an item that can't be made right is DROPPED —
 * a broken question never reaches a test. At the end the result goes through
 * `normalizeTest`, exactly like a test loaded from storage.
 */
import { convertLatexToMarkup } from "mathlive";
import type { Language } from "@/i18n/dictionaries";
import { checkBalance } from "@/lib/chem";
import { newId } from "@/lib/ids";
import { DEFAULT_GIVEN_FIND_LINES, DEFAULT_LINES, MAX_LINES, MAX_OPTIONS, MIN_GIVEN_FIND_LINES, MIN_OPTIONS, createQuestion } from "@/lib/questions";
import type { RichText, RichTextSegment } from "@/lib/richText";
import { normalizeTest } from "@/lib/storage/migrate";
import type { Question } from "@/lib/storage/types";
import { tokenize, wordRefs } from "@/lib/words";
import type { SubjectId } from "@/subjects/ids";
import type { AiType } from "./request";
import type { AiItem } from "./wire";

const MAX_TEXT = 3000;
const MAX_FORMULA = 400;
const MAX_ROWS = 10;

/** Georgian schools write tg / ctg, the way our editor stores them. */
const GEORGIAN_FUNCTIONS: [RegExp, string][] = [
  [/\\arctan(?![a-zA-Z])/g, "\\operatorname{arctg}"],
  [/\\arccot(?![a-zA-Z])/g, "\\operatorname{arcctg}"],
  [/\\tan(?![a-zA-Z])/g, "\\operatorname{tg}"],
  [/\\cot(?![a-zA-Z])/g, "\\operatorname{ctg}"],
];

function bracesBalanced(latex: string): boolean {
  let depth = 0;
  for (let i = 0; i < latex.length; i++) {
    if (latex[i] === "\\") i++; // an escaped character, e.g. \{
    else if (latex[i] === "{") depth++;
    else if (latex[i] === "}" && --depth < 0) return false;
  }
  return depth === 0;
}

/** A formula as our editor would store it, or null when it can't be drawn. */
export function cleanFormula(source: string, language: Language): string | null {
  let latex = source.trim();
  if (!latex || latex.length > MAX_FORMULA || !bracesBalanced(latex)) return null;
  // Layout commands that make no sense inside one inline formula.
  if (/\\(begin\{(document|align|equation)|documentclass|usepackage|newcommand|def\b|input\b|include\b|href|url)/.test(latex)) return null;
  if (language === "ka") for (const [pattern, replacement] of GEORGIAN_FUNCTIONS) latex = latex.replace(pattern, replacement);
  try {
    // The same engine that draws formulas in the editor and on paper. An unknown command is drawn as an error.
    if (/ML__error/.test(convertLatexToMarkup(latex))) return null;
  } catch {
    return null;
  }
  return latex;
}

/**
 * "ამოხსენით $x^2=4$" → [text, formula]. Returns null when a formula is
 * broken (the whole question is then dropped). Repairs: \( … \), \[ … \] and
 * $$ … $$ are read like $ … $; a formula that is only a number or a word
 * with no LaTeX stays a formula (teachers can edit it).
 */
export function richFromMarkup(source: string, language: Language): RichText | null {
  const text = source
    .replace(/\r\n?/g, "\n")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "$")
    .replace(/\$\$/g, "$")
    .trim();
  if (text.length > MAX_TEXT) return null;
  const parts = text.split(/(?<!\\)\$/);
  if (parts.length % 2 === 0) return null; // an opening $ without its closing one
  const segments: RichTextSegment[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      const plain = parts[i].replace(/\\\$/g, "$");
      if (plain) segments.push({ type: "text", text: plain });
    } else {
      const latex = cleanFormula(parts[i], language);
      if (latex === null) return null;
      segments.push({ type: "math", latex });
    }
  }
  return segments;
}

const isEmpty = (rich: RichText) => rich.every((segment) => (segment.type === "text" ? segment.text.trim() === "" : false));

/** Half points between 0.5 and 20; anything strange becomes 1. */
function cleanPoints(points: number): number {
  if (!Number.isFinite(points) || points <= 0) return 1;
  return Math.min(20, Math.max(0.5, Math.round(points * 2) / 2));
}
const clamp = (value: number, min: number, max: number, fallback: number) => (Number.isInteger(value) && value > 0 ? Math.min(max, Math.max(min, value)) : fallback);

type Context = { language: Language; allowed: readonly AiType[] };

/** One item → one question, or null (with the reason, for the tests and the server log). */
export function toQuestion(item: AiItem, context: Context): Question | { dropped: string } {
  const { language } = context;
  if (!context.allowed.includes(item.type)) return { dropped: "type not asked for" };
  const rich = (source: string) => richFromMarkup(source, language);
  const text = rich(item.text);
  if (!text || isEmpty(text)) return { dropped: "no readable question text" };
  const base = { text, points: cleanPoints(item.points) };
  const plain = (value: string) => value.replace(/\s+/g, " ").trim();

  switch (item.type) {
    case "multiple-choice": {
      const options = item.options.map(rich);
      if (options.some((option) => !option || isEmpty(option))) return { dropped: "an answer option is empty or broken" };
      if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) return { dropped: "wrong number of options" };
      if (new Set(item.options.map(plain)).size !== options.length) return { dropped: "two options are the same" };
      if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct >= options.length) return { dropped: "no correct option" };
      const withIds = options.map((option) => ({ id: newId(), text: option as RichText }));
      return { ...createQuestion("multiple-choice", base), type: "multiple-choice", options: withIds, correctOptionId: withIds[item.correct].id, lockOptions: false };
    }
    case "true-false":
      return { ...createQuestion("true-false", base), type: "true-false", correct: item.is_true };
    case "short-answer": {
      const answer = rich(item.answer);
      if (!answer || isEmpty(answer)) return { dropped: "no answer" };
      return { ...createQuestion("short-answer", base), type: "short-answer", answer };
    }
    case "open-answer":
      return { ...createQuestion("open-answer", base), type: "open-answer", lines: clamp(item.lines, 1, MAX_LINES, DEFAULT_LINES) };
    case "matching": {
      const pairs = item.pairs.slice(0, MAX_ROWS).map((pair) => ({ left: rich(pair.left), right: rich(pair.right) }));
      if (pairs.length < 2 || pairs.some((pair) => !pair.left || !pair.right || isEmpty(pair.left) || isEmpty(pair.right))) return { dropped: "fewer than two complete pairs" };
      if (new Set(item.pairs.slice(0, MAX_ROWS).map((pair) => plain(pair.right))).size !== pairs.length) return { dropped: "two pairs have the same answer" };
      const extras = item.extras.slice(0, 4).map(rich).filter((extra): extra is RichText => !!extra && !isEmpty(extra));
      const fresh = createQuestion("matching", base);
      if (fresh.type !== "matching") return { dropped: "internal" };
      return { ...fresh, pairs: pairs.map((pair) => ({ id: newId(), left: pair.left as RichText, right: pair.right as RichText })), extras: extras.map((extra) => ({ id: newId(), text: extra })) };
    }
    case "order": {
      const items = item.items.slice(0, MAX_ROWS).map(rich);
      if (items.length < 2 || items.some((entry) => !entry || isEmpty(entry))) return { dropped: "fewer than two items to order" };
      if (new Set(item.items.map(plain)).size !== item.items.length) return { dropped: "two items are the same" };
      const fresh = createQuestion("order", base);
      if (fresh.type !== "order") return { dropped: "internal" };
      return { ...fresh, items: items.map((entry) => ({ id: newId(), text: entry as RichText })) };
    }
    case "fill-blank": {
      const body = item.body.replace(/\r\n?/g, "\n").trim();
      if (!body || body.length > MAX_TEXT || body.includes("$")) return { dropped: "no usable text with gaps" };
      const tokens = tokenize(body);
      const refs = wordRefs(tokens);
      const used = new Set<number>();
      const blanks = [];
      for (const word of item.blanks.map((entry) => entry.trim())) {
        // The first place this word appears that isn't a gap already.
        const index = tokens.findIndex((token, i) => token.isWord && token.text === word && !used.has(i));
        if (index === -1) continue; // a "gap" for a word that isn't in the text: skipped (repair)
        used.add(index);
        blanks.push({ index, blank: { ...refs[index]!, hint: "" } });
      }
      if (blanks.length === 0) return { dropped: "none of the gap words is in the text" };
      const fresh = createQuestion("fill-blank", base);
      if (fresh.type !== "fill-blank") return { dropped: "internal" };
      return { ...fresh, body, blanks: blanks.sort((a, b) => a.index - b.index).map((entry) => entry.blank), mode: "open", numbered: false, extras: [] };
    }
    case "given-find": {
      const [given, find, solution, answer] = [item.given, item.find, item.solution, item.answer].map(rich);
      if (!given || !find || !solution || !answer) return { dropped: "a part of the solution is broken" };
      if (isEmpty(answer)) return { dropped: "no final answer" };
      const fresh = createQuestion("given-find", base);
      if (fresh.type !== "given-find") return { dropped: "internal" };
      return { ...fresh, given, find, solution, answer, lines: clamp(item.lines, MIN_GIVEN_FIND_LINES, MAX_LINES, DEFAULT_GIVEN_FIND_LINES) };
    }
    case "balance": {
      // The atoms on both sides are counted: an equation that isn't really balanced is left out.
      const balanced = item.equations.map((equation) => equation.trim()).filter((equation) => equation.length <= 200 && checkBalance(equation).status === "balanced");
      if (balanced.length === 0) return { dropped: "no balanced equation" };
      const fresh = createQuestion("balance", base);
      if (fresh.type !== "balance") return { dropped: "internal" };
      return { ...fresh, equations: balanced.slice(0, 8).map((equation) => ({ id: newId(), balanced: equation })) };
    }
  }
}

export type Converted = { questions: Question[]; dropped: string[] };

/** All items → valid questions (at most `limit`), plus why the others were left out. */
export function convertItems(items: AiItem[], options: { subject: SubjectId; language: Language; allowed: readonly AiType[]; limit: number }): Converted {
  const built: Question[] = [];
  const dropped: string[] = [];
  for (const item of items) {
    const result = toQuestion(item, options);
    if ("dropped" in result) dropped.push(`${item.type}: ${result.dropped}`);
    else if (built.length < options.limit) built.push(result);
  }
  // The same door every stored test comes through: anything it rejects is not a question of ours.
  const checked = normalizeTest({ id: "ai-check", subjectId: options.subject, questions: built });
  const questions = checked?.questions ?? [];
  if (questions.length < built.length) dropped.push(`${built.length - questions.length} rejected by normalizeTest`);
  return { questions, dropped };
}
