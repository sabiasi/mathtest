// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@/i18n/dictionaries";
import { normalizeTest } from "@/lib/storage/migrate";
import type { Question } from "@/lib/storage/types";
import { SUBJECT_IDS } from "@/subjects/ids";
import { getToolkit } from "@/subjects/registry";
import { cleanFormula, convertItems, richFromMarkup, toQuestion } from "./convert";
import { mockItems } from "./mock";
import { userPrompt, SYSTEM_PROMPT } from "./prompt";
import { AI_TYPES, aiTypesFor, parseGenerateRequest, type AiType, type GenerateRequest } from "./request";
import { OUTPUT_SCHEMA, emptyItem, readItems, type AiItem } from "./wire";

const ka = { language: "ka" as const, allowed: AI_TYPES };
const make = (type: AiType, extra: Partial<AiItem>) => toQuestion({ ...emptyItem(type, "კითხვა"), ...extra }, ka);
const ok = (result: ReturnType<typeof toQuestion>): Question => {
  if ("dropped" in result) throw new Error(`dropped: ${result.dropped}`);
  return result;
};
const dropped = (result: ReturnType<typeof toQuestion>) => ("dropped" in result ? result.dropped : null);

describe("text with formulas", () => {
  it("splits $…$ into our text and formula pieces", () => {
    expect(richFromMarkup("იპოვეთ $x$, თუ $2x+3=11$.", "ka")).toEqual([
      { type: "text", text: "იპოვეთ " }, { type: "math", latex: "x" }, { type: "text", text: ", თუ " }, { type: "math", latex: "2x+3=11" }, { type: "text", text: "." },
    ]);
    expect(richFromMarkup("რა არის $\\ce{H2SO4}$?", "ka")).toEqual([{ type: "text", text: "რა არის " }, { type: "math", latex: "\\ce{H2SO4}" }, { type: "text", text: "?" }]);
    expect(richFromMarkup("ფასი 5\\$ არის", "ka")).toEqual([{ type: "text", text: "ფასი 5$ არის" }]);
  });

  it("repairs other ways of marking a formula", () => {
    const expected = [{ type: "text", text: "a " }, { type: "math", latex: "\\frac{1}{2}" }];
    expect(richFromMarkup("a \\(\\frac{1}{2}\\)", "en")).toEqual(expected);
    expect(richFromMarkup("a $$\\frac{1}{2}$$", "en")).toEqual(expected);
    expect(richFromMarkup("a \\[\\frac{1}{2}\\]", "en")).toEqual(expected);
  });

  it("Georgian maths: tg / ctg the way our editor stores them", () => {
    expect(cleanFormula("\\tan x + \\cot x", "ka")).toBe("\\operatorname{tg} x + \\operatorname{ctg} x");
    expect(cleanFormula("\\arctan 1", "ka")).toBe("\\operatorname{arctg} 1");
    expect(cleanFormula("\\tan x", "en")).toBe("\\tan x");
    expect(cleanFormula("\\tanh x", "ka")).toBe("\\tanh x"); // a different function: untouched
    expect(cleanFormula("[2; 5)", "ka")).toBe("[2; 5)");
  });

  it("refuses formulas that cannot be drawn", () => {
    for (const broken of ["\\frac{1}{", "x^{2", "}", "\\notacommand{2}", "", "\\begin{align}x\\end{align}", "\\href{http://x}{y}", "x".repeat(500)]) {
      expect(cleanFormula(broken, "ka"), broken.slice(0, 20)).toBeNull();
    }
    expect(richFromMarkup("ერთი $ ნიშანი", "ka")).toBeNull();
    expect(richFromMarkup("ცუდი $\\frac{1}{$ ფორმულა", "ka")).toBeNull();
  });
});

describe("each question type", () => {
  it("multiple choice: the right option is marked by id", () => {
    const q = ok(make("multiple-choice", { options: ["$1$", "$2$", "$3$", "$4$"], correct: 2, points: 2 }));
    if (q.type !== "multiple-choice") throw new Error("type");
    expect(q.options).toHaveLength(4);
    expect(q.correctOptionId).toBe(q.options[2].id);
    expect(q.points).toBe(2);
    expect(dropped(make("multiple-choice", { options: ["a", "b"], correct: 5 }))).toMatch(/correct/);
    expect(dropped(make("multiple-choice", { options: ["a"], correct: 0 }))).toMatch(/number/);
    expect(dropped(make("multiple-choice", { options: ["a", " a "], correct: 0 }))).toMatch(/same/);
    expect(dropped(make("multiple-choice", { options: ["a", ""], correct: 0 }))).toMatch(/empty/);
    expect(dropped(make("multiple-choice", { options: ["a", "$\\frac{$"], correct: 0 }))).toMatch(/broken/);
  });

  it("true / false, short and open answers", () => {
    expect(ok(make("true-false", { is_true: true }))).toMatchObject({ type: "true-false", correct: true });
    expect(ok(make("short-answer", { answer: "$x=4$" }))).toMatchObject({ type: "short-answer", answer: [{ type: "math", latex: "x=4" }] });
    expect(dropped(make("short-answer", { answer: " " }))).toMatch(/answer/);
    expect(ok(make("open-answer", { lines: 99 }))).toMatchObject({ lines: 30 });
    expect(ok(make("open-answer", { lines: 0 }))).toMatchObject({ lines: 5 });
  });

  it("matching and ordering", () => {
    const q = ok(make("matching", { pairs: [{ left: "a", right: "1" }, { left: "b", right: "2" }], extras: ["3", ""] }));
    expect(q).toMatchObject({ type: "matching", pairs: [{ left: [{ text: "a" }] }, {}], extras: [{}] });
    expect(dropped(make("matching", { pairs: [{ left: "a", right: "1" }] }))).toBeTruthy();
    expect(dropped(make("matching", { pairs: [{ left: "a", right: "1" }, { left: "b", right: "1" }] }))).toMatch(/same/);
    expect(ok(make("order", { items: ["one", "two", "three"] }))).toMatchObject({ type: "order", items: [{}, {}, {}] });
    expect(dropped(make("order", { items: ["one"] }))).toBeTruthy();
  });

  it("fill in the blanks: gaps point at real words of the text", () => {
    const q = ok(make("fill-blank", { body: "და ის და მე. თბილისი დედაქალაქია.", blanks: ["დედაქალაქია", "და", "და", "არარსებული"] }));
    if (q.type !== "fill-blank") throw new Error("type");
    expect(q.blanks).toEqual([{ word: "და", occurrence: 0, hint: "" }, { word: "და", occurrence: 1, hint: "" }, { word: "დედაქალაქია", occurrence: 0, hint: "" }]);
    expect(dropped(make("fill-blank", { body: "ტექსტი აქ.", blanks: ["სხვა"] }))).toMatch(/gap/);
    expect(dropped(make("fill-blank", { body: "", blanks: ["x"] }))).toBeTruthy();
  });

  it("given / find problems and chemical equations", () => {
    expect(ok(make("given-find", { given: "$v=5$", find: "$s$", solution: "$s=vt$", answer: "$10\\ \\text{მ}$" }))).toMatchObject({ type: "given-find", lines: 7 });
    expect(dropped(make("given-find", { given: "$v=5$", find: "$s$", solution: "$s=vt$", answer: "" }))).toMatch(/answer/);
    const q = ok(make("balance", { equations: ["2H2 + O2 -> 2H2O", "H2 + O2 -> H2O", "nonsense"] }));
    if (q.type !== "balance") throw new Error("type");
    expect(q.equations.map((e) => e.balanced)).toEqual(["2H2 + O2 -> 2H2O"]); // the unbalanced one is left out
    expect(dropped(make("balance", { equations: ["H2 + O2 -> H2O"] }))).toMatch(/balanced/);
  });

  it("drops what was not asked for or has no text; cleans the points", () => {
    expect(dropped(toQuestion(emptyItem("order", "x"), { language: "ka", allowed: ["true-false"] }))).toMatch(/not asked/);
    expect(dropped(make("true-false", { text: "  " }))).toMatch(/text/);
    expect(ok(make("true-false", { points: -3 })).points).toBe(1);
    expect(ok(make("true-false", { points: 2.3 })).points).toBe(2.5);
    expect(ok(make("true-false", { points: 500 })).points).toBe(20);
  });
});

describe("the whole answer", () => {
  it("keeps the good questions, at most the number asked for, and says why others were left out", () => {
    const items = [
      { ...emptyItem("true-false", "ერთი"), is_true: true },
      { ...emptyItem("multiple-choice", "ორი"), options: ["a"], correct: 0 },
      { ...emptyItem("short-answer", "სამი"), answer: "3" },
      { ...emptyItem("true-false", "ოთხი") },
    ];
    const { questions, dropped: why } = convertItems(items, { subject: "math", language: "ka", allowed: AI_TYPES, limit: 2 });
    expect(questions.map((q) => q.type)).toEqual(["true-false", "short-answer"]);
    expect(why).toHaveLength(1);
    expect(new Set(questions.map((q) => q.id)).size).toBe(2);
    // What we hand back is unchanged by the door every stored test goes through.
    expect(normalizeTest({ id: "t", questions })?.questions).toEqual(questions);
  });

  it("reads untrusted JSON without trusting it", () => {
    expect(readItems(null)).toEqual([]);
    expect(readItems({ questions: "no" })).toEqual([]);
    const items = readItems({ questions: [{ type: "essay", text: "x" }, 5, { type: "true-false", text: 7, options: "x", pairs: [null, { left: 1 }], is_true: "yes", points: "2" }] });
    expect(items).toEqual([{ ...emptyItem("true-false"), correct: -1, pairs: [{ left: "", right: "" }] }]);
  });

  it("the schema sent to the AI lists every field as required and allows nothing else", () => {
    const item = OUTPUT_SCHEMA.properties.questions.items;
    expect([...item.required].sort()).toEqual(Object.keys(emptyItem("order")).sort());
    expect(item.additionalProperties).toBe(false);
    expect(item.properties.type.enum).toEqual([...AI_TYPES]);
  });
});

describe("mock mode", () => {
  it.each(SUBJECT_IDS.flatMap((subject) => LANGUAGES.map((language) => [subject, language] as const)))("%s (%s): every sample of every offered type is valid", (subject, language) => {
    const types = aiTypesFor(getToolkit(subject).questionTypes);
    expect(types.length).toBeGreaterThan(3);
    for (const type of types) for (const shift of [0, 1]) {
      const request: GenerateRequest = { subject, grade: "9", topic: "თემა", types: [type], count: 2, difficulty: "medium", language, source: "" };
      const { questions, dropped: why } = convertItems(mockItems(request, shift), { subject, language, allowed: types, limit: 2 });
      expect(why, `${type}`).toEqual([]);
      expect(questions.map((q) => q.type)).toEqual([type, type]);
    }
  });

  it("goes round the asked types and gives a different question when regenerating", () => {
    const request: GenerateRequest = { subject: "math", grade: "", topic: "წილადები", types: ["multiple-choice", "true-false"], count: 5, difficulty: "easy", language: "ka", source: "" };
    expect(mockItems(request).map((i) => i.type)).toEqual(["multiple-choice", "true-false", "multiple-choice", "true-false", "multiple-choice"]);
    expect(mockItems({ ...request, count: 1 }, 1)[0].text).not.toBe(mockItems({ ...request, count: 1 }, 0)[0].text);
  });
});

describe("the request", () => {
  const offered = (subject: GenerateRequest["subject"]) => aiTypesFor(getToolkit(subject).questionTypes);
  const good = { subject: "math", grade: "9", topic: "წილადები", types: ["multiple-choice", "balance", "essay"], count: 5, difficulty: "hard", language: "ka", source: "" };

  it("keeps only the types that subject offers", () => {
    expect(parseGenerateRequest(good, offered)).toMatchObject({ subject: "math", types: ["multiple-choice"], count: 5, difficulty: "hard" });
    expect(parseGenerateRequest({ ...good, subject: "chemistry" }, offered)).toMatchObject({ types: ["multiple-choice", "balance"] });
    expect(offered("math")).not.toContain("balance");
    expect(offered("physics")).toContain("given-find");
  });

  it("refuses what is missing, wrong or too long — and never cuts a text silently", () => {
    expect(parseGenerateRequest(null, offered)).toEqual({ problem: "invalid" });
    expect(parseGenerateRequest({ ...good, subject: "cooking" }, offered)).toEqual({ problem: "invalid" });
    expect(parseGenerateRequest({ ...good, topic: "" }, offered)).toEqual({ problem: "topic" });
    expect(parseGenerateRequest({ ...good, topic: "", source: "x".repeat(30) }, offered)).toMatchObject({ topic: "" });
    expect(parseGenerateRequest({ ...good, types: ["essay"] }, offered)).toEqual({ problem: "types" });
    for (const count of [0, 11, 2.5, "5", null]) expect(parseGenerateRequest({ ...good, count }, offered), String(count)).toEqual({ problem: "invalid" });
    expect(parseGenerateRequest({ ...good, source: "x".repeat(8001) }, offered)).toEqual({ problem: "tooLong" });
    expect(parseGenerateRequest({ ...good, difficulty: "x", language: "fr" }, offered)).toMatchObject({ difficulty: "medium", language: "ka" });
  });

  it("the prompt names the conventions and keeps a pasted text apart as material", () => {
    expect(SYSTEM_PROMPT).toContain("\\operatorname{tg}");
    expect(SYSTEM_PROMPT).toContain("semicolon");
    expect(SYSTEM_PROMPT).toContain("\\ce{");
    const prompt = userPrompt({ ...(parseGenerateRequest(good, offered) as GenerateRequest), source: "ტექსტი აქ" });
    expect(prompt).toContain("Language of the questions: Georgian");
    expect(prompt).toContain("Number of questions: 5");
    expect(prompt).toMatch(/<source_text>\nტექსტი აქ\n<\/source_text>$/);
  });
});
