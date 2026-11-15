import { describe, expect, it } from "vitest";
import { createQuestion } from "@/lib/questions";
import { richTextFromString } from "@/lib/richText";
import type { Question } from "@/lib/storage/types";
import { bankFacets, bankImageIds, bankItemFromRow, filterBank, parseTags, questionForBank, questionFromBank, summaryOf, wrapQuestions, type BankItem } from "./bank";

const question = (text: string, type: Question["type"] = "short-answer"): Question => ({ ...createQuestion(type), text: richTextFromString(text) });
const row = (data: unknown, extra: Record<string, unknown> = {}) => ({ id: "b1", subject: "math", grade: "7", type: "short-answer", tags: ["ალგებრა"], data, created_at: "2026-11-15T10:00:00Z", ...extra });
const item = (text: string, extra: Record<string, unknown> = {}) => bankItemFromRow(row(question(text), extra)) as BankItem;

describe("question bank helpers", () => {
  it("reads tags typed with commas: trimmed, no repeats, at most 12", () => {
    expect(parseTags(" ალგებრა, საკონტროლო ,, ალგებრა;  unit   test ")).toEqual(["ალგებრა", "საკონტროლო", "unit test"]);
    expect(parseTags(Array.from({ length: 20 }, (_, i) => `t${i}`).join(","))).toHaveLength(12);
    expect(parseTags("x".repeat(80))[0]).toHaveLength(30);
  });

  it("summarises a question's words and formulas on one line", () => {
    const q: Question = { ...createQuestion("short-answer"), text: [{ type: "text", text: "ამოხსენით:\n" }, { type: "math", latex: "x^2=4" }] };
    expect(summaryOf(q)).toBe("ამოხსენით: x^2=4");
  });

  it("turns a database row into a checked item, and refuses rows that aren't questions", () => {
    const good = item("2 + 2 = ?");
    expect(good).toMatchObject({ id: "b1", subject: "math", grade: "7", type: "short-answer", tags: ["ალგებრა"] });
    expect(bankItemFromRow(row({ nonsense: true }))).toBeNull();
    expect(bankItemFromRow(row(question("x"), { subject: "astrology" }))).toBeNull();
    expect(bankItemFromRow(null)).toBeNull();
    // The type always comes from the question itself, not from the (changeable) column.
    expect(bankItemFromRow(row(question("x", "open-answer")))?.type).toBe("open-answer");
  });

  it("saves without the editor tip, and inserts copies with new ids", () => {
    const original: Question = { ...createQuestion("multiple-choice"), tip: "a note for the teacher" };
    expect(questionForBank(original).tip).toBeUndefined();
    expect(original.tip).toBe("a note for the teacher");
    const saved = bankItemFromRow(row(original)) as BankItem;
    const copy = questionFromBank(saved);
    expect(copy.id).not.toBe(saved.question.id);
    expect(copy.type).toBe("multiple-choice");
    expect(wrapQuestions([copy], "math")?.questions).toHaveLength(1);
  });

  it("filters by search words, subject, grade, type and tag", () => {
    const items = [
      item("კვადრატული განტოლება", { id: "1" }),
      item("ნიუტონის მეორე კანონი", { id: "2", subject: "physics", grade: "9", tags: ["დინამიკა"] }),
      bankItemFromRow(row(question("ახსენით", "open-answer"), { id: "3", grade: "9", tags: [] })) as BankItem,
    ];
    const ids = (filter: Parameters<typeof filterBank>[1]) => filterBank(items, filter).map((i) => i.id);
    expect(ids({})).toEqual(["1", "2", "3"]);
    expect(ids({ search: "განტოლება" })).toEqual(["1"]);
    expect(ids({ search: "დინამიკა" })).toEqual(["2"]); // tags are searched too
    expect(ids({ subject: "math" })).toEqual(["1", "3"]);
    expect(ids({ grade: "9", type: "open-answer" })).toEqual(["3"]);
    expect(ids({ tag: "ალგებრა" })).toEqual(["1"]);
    expect(bankFacets(items)).toEqual({ subjects: ["math", "physics"], grades: ["7", "9"], types: ["short-answer", "open-answer"], tags: ["ალგებრა", "დინამიკა"] });
  });

  it("reports the pictures bank questions use (so picture clean-up keeps them), not diagrams", () => {
    const q = question("სურათი");
    const withPicture: Question = { ...q, images: [{ id: "p", imageId: "img-1", width: 10, height: 10, widthPercent: 50, position: "above", caption: "" }] };
    expect(bankImageIds([bankItemFromRow(row(withPicture)) as BankItem, item("ტექსტი")])).toEqual(["img-1"]);
  });
});
