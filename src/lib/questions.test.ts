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

  it("copies every question type of every sample: no id is shared, links inside still work", async () => {
    const { SUBJECT_IDS } = await import("@/subjects/ids");
    const { sampleFor } = await import("@/samples");
    const { normalizeTest } = await import("./storage/migrate");
    /** Every id inside a value (not the names of picture files). */
    const idsIn = (value: unknown, found: string[] = []): string[] => {
      if (Array.isArray(value)) value.forEach((item) => idsIn(item, found));
      else if (typeof value === "object" && value !== null) {
        for (const [key, item] of Object.entries(value)) {
          if (key === "id" && typeof item === "string") found.push(item);
          else idsIn(item, found);
        }
      }
      return found;
    };
    const types = new Set<string>();
    for (const subject of SUBJECT_IDS) {
      const sample = sampleFor(subject);
      for (const question of sample.questions) {
        types.add(question.type);
        const before = JSON.stringify(question);
        const copy = duplicateQuestion(question);
        expect(JSON.stringify(question), `${subject} ${question.type}: the original is untouched`).toBe(before);
        const oldIds = idsIn(question);
        const newIds = idsIn(copy);
        expect(newIds, `${subject} ${question.type}`).toHaveLength(oldIds.length);
        expect(newIds.filter((id) => oldIds.includes(id)), `${subject} ${question.type}: shared ids`).toEqual([]);
        // Put the old ids back: the copy is then the original — nothing else changed, every link was renamed with its target.
        let restored = JSON.stringify(copy);
        newIds.forEach((id, i) => (restored = restored.split(JSON.stringify(id)).join(JSON.stringify(oldIds[i]))));
        expect(restored, `${subject} ${question.type}`).toBe(before);
        // The copy is valid saved data (links to people, organisms, steps… still resolve).
        const reloaded = normalizeTest({ ...sample, questions: [copy] })!.questions[0];
        expect(reloaded, `${subject} ${question.type}: survives loading`).toEqual(copy);
      }
    }
    expect(types.size).toBeGreaterThan(30);
  });

  it("gives a short fixed id a new one too, and keeps the stored picture", () => {
    const q = createQuestion("short-answer", { id: "a" });
    q.images = [{ id: "placement-id-1", imageId: "stored-picture-1", width: 10, height: 10 } as unknown as (typeof q.images)[number]];
    const copy = duplicateQuestion(q);
    expect(copy.id).not.toBe("a");
    expect(copy.images[0].id).not.toBe("placement-id-1");
    expect(copy.images[0].imageId).toBe("stored-picture-1");
  });
});

describe("formatPoints", () => {
  it("drops needless decimals", () => {
    expect(formatPoints(2)).toBe("2");
    expect(formatPoints(1.5)).toBe("1.5");
    expect(formatPoints(0.1 + 0.2)).toBe("0.3");
  });
});

describe("sections", () => {
  it("adds up the points of the questions in each section, and texts have no number", async () => {
    const { sectionPoints, questionNumbers } = await import("./questions");
    const reading = createQuestion("section", { id: "s1" });
    const text = createQuestion("passage", { id: "t" });
    const q1 = createQuestion("true-false", { id: "a", points: 2 });
    const q2 = createQuestion("short-answer", { id: "b", points: 3 });
    const writing = createQuestion("section", { id: "s2" });
    const q3 = createQuestion("essay", { id: "c", points: 10 });
    const questions = [reading, text, q1, q2, writing, q3];
    expect(Object.fromEntries(sectionPoints(questions))).toEqual({ s1: 5, s2: 10 });
    expect([...questionNumbers(questions).values()]).toEqual([null, null, 1, 2, null, 3]);
  });
});
