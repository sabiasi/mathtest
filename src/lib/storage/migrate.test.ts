import { describe, expect, it } from "vitest";
import { normalizeTest } from "./migrate";

describe("normalizeTest", () => {
  it("upgrades a test saved by Phase 0 (missing the new fields)", () => {
    const old = {
      id: "t1",
      title: "ალგებრა",
      subject: "",
      grade: "",
      date: "",
      instructions: "",
      questions: [],
      createdAt: "2026-11-12T10:00:00.000Z",
      updatedAt: "2026-11-12T10:00:00.000Z",
    };
    expect(normalizeTest(old)).toMatchObject({
      id: "t1",
      title: "ალგებრა",
      schoolName: "",
      timeLimitMinutes: null,
      labelStyle: "georgian",
      questions: [],
    });
  });

  it("drops broken questions and repairs the rest", () => {
    const test = normalizeTest({
      id: "t1",
      questions: [
        { id: "q1", type: "multiple-choice", text: "?", points: 2, options: [{ id: "a", text: "1" }], correctOptionId: "zzz" },
        { id: "q2", type: "some-future-type" },
        "not a question",
        { id: "q3", type: "open-answer", lines: 999 },
      ],
    });
    expect(test?.questions).toEqual([
      { id: "q1", type: "multiple-choice", text: "?", points: 2, options: [{ id: "a", text: "1" }], correctOptionId: null },
      { id: "q3", type: "open-answer", text: "", points: 1, lines: 30 },
    ]);
  });

  it("returns null for something that isn't a test", () => {
    expect(normalizeTest(null)).toBeNull();
    expect(normalizeTest({ title: "no id" })).toBeNull();
  });
});
