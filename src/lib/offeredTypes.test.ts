import { describe, expect, it } from "vitest";
import { findProblems } from "@/lib/checks";
import { HIDDEN_FOR_TESTING } from "@/lib/hiddenForTesting";
import { changeQuestionType, createQuestion } from "@/lib/questions";
import { normalizeTest } from "@/lib/storage/migrate";
import type { OpenAnswerQuestion, Question, ShortAnswerQuestion, Test } from "@/lib/storage/types";
import { SUBJECT_IDS } from "@/subjects/ids";
import { getToolkit, offeredQuestionTypes } from "@/subjects/registry";
import { isTypeHidden, withoutHiddenTypes } from "./offeredTypes";

const text = (value: string) => [{ type: "text" as const, text: value }];
const test = (subjectId: Test["subjectId"], questions: Question[]): Test => normalizeTest({ id: "t", subjectId, questions }) as Test;

describe("offered question types (teacher trial)", () => {
  it("every subject still offers the open question and multiple choice, never the short answer", () => {
    for (const subject of SUBJECT_IDS) {
      const offered = offeredQuestionTypes(subject);
      expect(offered, subject).toContain("open-answer");
      expect(offered, subject).toContain("multiple-choice");
      expect(offered, subject).not.toContain("short-answer");
      // Only types of the toolkit, in its order.
      expect(getToolkit(subject).questionTypes.filter((type) => offered.includes(type))).toEqual(offered);
    }
  });

  it("hides the chosen types per subject only", () => {
    expect(isTypeHidden("history", "timeline")).toBe(true);
    expect(isTypeHidden("history", "order")).toBe(false);
    expect(isTypeHidden("english", "listening")).toBe(true);
    expect(isTypeHidden("english", "crossword")).toBe(false);
    expect(isTypeHidden("biology", "punnett")).toBe(false);
    expect(isTypeHidden("biology", "pedigree")).toBe(true);
    expect(isTypeHidden("georgian", "mark-words")).toBe(true);
    // Every hidden type is a real type of that subject (no typos).
    for (const [subject, types] of Object.entries(HIDDEN_FOR_TESTING.questionTypes)) {
      if (subject === "all") continue;
      for (const type of types) expect(getToolkit(subject as Test["subjectId"]).questionTypes, `${subject} ${type}`).toContain(type);
    }
  });

  it("a ready-made test: short answers become open questions on one line, hidden types are left out", () => {
    const short: ShortAnswerQuestion = { ...(createQuestion("short-answer") as ShortAnswerQuestion), id: "s", points: 2, text: text("2 + 2 = ?"), answer: text("4") };
    const timeline = { ...createQuestion("timeline"), id: "tl" };
    const mc = { ...createQuestion("multiple-choice"), id: "mc" };
    const result = withoutHiddenTypes(test("history", [short, timeline, mc]));
    expect(result.questions.map((q) => q.id)).toEqual(["s", "mc"]);
    const open = result.questions[0] as OpenAnswerQuestion;
    expect(open).toMatchObject({ type: "open-answer", answerSpace: "short", answer: text("4"), points: 2, text: text("2 + 2 = ?") });
    // Still valid saved data.
    expect(normalizeTest(JSON.parse(JSON.stringify(result)))).toEqual(result);
  });

  it("questions about a hidden listening go with it, up to the next text block", () => {
    const listening = { ...createQuestion("listening"), id: "l" };
    const about = { ...createQuestion("multiple-choice"), id: "about" };
    const passage = { ...createQuestion("passage"), id: "p" };
    const after = { ...createQuestion("multiple-choice"), id: "after" };
    const result = withoutHiddenTypes(test("english", [listening, about, passage, after]));
    expect(result.questions.map((q) => q.id)).toEqual(["p", "after"]);
  });

  it("returns the same test when nothing is hidden", () => {
    const original = test("math", [{ ...createQuestion("multiple-choice"), id: "a" }]);
    expect(withoutHiddenTypes(original)).toBe(original);
  });
});

describe("open question on one line (the merged short answer)", () => {
  it("switching short answer ↔ open question keeps the answer", () => {
    const short: ShortAnswerQuestion = { ...(createQuestion("short-answer") as ShortAnswerQuestion), points: 2, text: text("x?"), answer: text("5") };
    const open = changeQuestionType(short, "open-answer") as OpenAnswerQuestion;
    expect(open).toMatchObject({ type: "open-answer", answerSpace: "short", answer: text("5"), points: 2, text: text("x?") });
    const back = changeQuestionType(open, "short-answer") as ShortAnswerQuestion;
    expect(back).toMatchObject({ type: "short-answer", answer: text("5"), text: text("x?") });
  });

  it("is loaded with its answer; an empty answer is not stored", () => {
    const loaded = test("math", [
      { ...createQuestion("open-answer"), id: "a", answerSpace: "short", answer: text("7") } as Question,
      { ...createQuestion("open-answer"), id: "b", answer: [] } as Question,
      { ...createQuestion("open-answer"), id: "c", answerSpace: "wrong" } as unknown as Question,
    ]);
    expect(loaded.questions[0]).toMatchObject({ answerSpace: "short", answer: text("7") });
    expect(loaded.questions[1]).not.toHaveProperty("answer");
    expect(loaded.questions[2]).not.toHaveProperty("answerSpace");
  });

  it("warns about a missing answer only on one line (lines / blank space may have none)", () => {
    const base = { ...createQuestion("open-answer"), text: text("?") } as OpenAnswerQuestion;
    const problems = findProblems(test("math", [{ ...base, id: "a", answerSpace: "short" }, { ...base, id: "b", answerSpace: "lines" }]));
    expect(problems).toEqual([{ kind: "noAnswer", number: 1, keyOnly: true }]);
  });
});
