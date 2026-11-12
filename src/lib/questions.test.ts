import { describe, expect, it } from "vitest";
import {
  changeQuestionType,
  createQuestion,
  duplicateQuestion,
  formatPoints,
  optionLabel,
  totalPoints,
} from "./questions";
import type { MultipleChoiceQuestion } from "./storage/types";

describe("totalPoints", () => {
  it("is 0 for a test without questions", () => {
    expect(totalPoints([])).toBe(0);
  });

  it("adds up the points of every question", () => {
    const questions = [
      { ...createQuestion("multiple-choice"), points: 2 },
      { ...createQuestion("true-false"), points: 3 },
      { ...createQuestion("open-answer"), points: 1.5 },
    ];
    expect(totalPoints(questions)).toBe(6.5);
  });
});

describe("optionLabel", () => {
  it("uses Latin letters", () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => optionLabel(i, "latin")).join("")).toBe("ABCDEF");
  });

  it("uses Georgian letters", () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => optionLabel(i, "georgian")).join("")).toBe("აბგდევ");
  });
});

describe("createQuestion", () => {
  it("starts multiple choice with 4 empty options and nothing marked", () => {
    const q = createQuestion("multiple-choice") as MultipleChoiceQuestion;
    expect(q.options).toHaveLength(4);
    expect(q.correctOptionId).toBeNull();
  });
});

describe("changeQuestionType", () => {
  it("keeps id, text and points", () => {
    const text = [{ type: "text" as const, text: "2 + 2 = ?" }];
    const q = { ...createQuestion("short-answer"), text, points: 4 };
    const changed = changeQuestionType(q, "open-answer");
    expect(changed).toMatchObject({ id: q.id, text, points: 4, type: "open-answer" });
  });
});

describe("duplicateQuestion", () => {
  it("gives the copy and its options new ids but keeps the correct answer", () => {
    const q = createQuestion("multiple-choice") as MultipleChoiceQuestion;
    q.correctOptionId = q.options[2].id;
    const copy = duplicateQuestion(q) as MultipleChoiceQuestion;

    expect(copy.id).not.toBe(q.id);
    expect(copy.options.map((o) => o.id)).not.toContain(q.options[0].id);
    expect(copy.correctOptionId).toBe(copy.options[2].id);
  });
});

describe("formatPoints", () => {
  it("drops needless decimals", () => {
    expect(formatPoints(2)).toBe("2");
    expect(formatPoints(1.5)).toBe("1.5");
    expect(formatPoints(0.1 + 0.2)).toBe("0.3");
  });
});
