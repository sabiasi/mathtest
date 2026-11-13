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
      printOptions: { fontSize: "normal", showPoints: true, columns: 1 },
      subjectId: "math", // every test before subjects existed was a math test
    });
  });

  it("keeps Given / Find / Solution problems and repairs their lines", () => {
    const test = normalizeTest({ id: "t", questions: [{ id: "q", type: "given-find", text: "?", lines: 1, given: "m = 2" }] });
    expect(test?.questions[0]).toMatchObject({ type: "given-find", lines: 4, given: [{ type: "text", text: "m = 2" }], find: [], solution: [], answer: [] });
  });

  it("keeps valid diagrams and drops broken ones", () => {
    const test = normalizeTest({
      id: "t",
      questions: [
        {
          id: "q",
          type: "open-answer",
          images: [
            { id: "a", imageId: "", diagram: { kind: "circuit", cols: 2, rows: 1, elements: [] }, width: 200, height: 150 },
            { id: "b", imageId: "", diagram: { kind: "unknown" } },
            { id: "c", imageId: "" }, // neither a picture nor a diagram
            { id: "d", imageId: "pic1" },
          ],
        },
      ],
    });
    expect(test?.questions[0].images.map((i) => i.id)).toEqual(["a", "d"]);
    expect(test?.questions[0].images[0].diagram?.kind).toBe("circuit");
  });

  it("finds the subject of tests saved before subjects existed", () => {
    expect(normalizeTest({ id: "a", subject: "ფიზიკა" })?.subjectId).toBe("physics");
    expect(normalizeTest({ id: "b", subject: " Chemistry " })?.subjectId).toBe("chemistry");
    expect(normalizeTest({ id: "c", subject: "ალგებრა" })?.subjectId).toBe("math");
    expect(normalizeTest({ id: "d", subject: "ხელოვნება" })?.subjectId).toBe("math");
    // A saved subjectId wins; an unknown one is repaired.
    expect(normalizeTest({ id: "e", subject: "ფიზიკა", subjectId: "history" })?.subjectId).toBe("history");
    expect(normalizeTest({ id: "f", subjectId: "astrology" })?.subjectId).toBe("math");
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
      {
        id: "q1",
        type: "multiple-choice",
        text: [{ type: "text", text: "?" }],
        points: 2,
        images: [],
        grid: null,
        options: [{ id: "a", text: [{ type: "text", text: "1" }] }],
        correctOptionId: null,
        lockOptions: false,
      },
      { id: "q3", type: "open-answer", text: [], points: 1, images: [], grid: null, lines: 30 },
    ]);
  });

  it("returns null for something that isn't a test", () => {
    expect(normalizeTest(null)).toBeNull();
    expect(normalizeTest({ title: "no id" })).toBeNull();
  });
});

describe("normalizeTest (Phase 1 → Phase 2)", () => {
  it("turns plain-string question text, options and answers into rich text", () => {
    const test = normalizeTest({
      id: "t1",
      questions: [
        { id: "q1", type: "multiple-choice", text: "რამდენია 2+2?", points: 1, options: [{ id: "a", text: "4" }], correctOptionId: "a" },
        { id: "q2", type: "short-answer", text: "x=?", points: 1, answer: "5" },
      ],
    });
    expect(test?.questions[0]).toMatchObject({
      text: [{ type: "text", text: "რამდენია 2+2?" }],
      options: [{ id: "a", text: [{ type: "text", text: "4" }] }],
      correctOptionId: "a",
    });
    expect(test?.questions[1]).toMatchObject({ answer: [{ type: "text", text: "5" }] });
  });
});

describe("normalizeTest (variants)", () => {
  it("gives older tests variants switched off, with a stable seed", () => {
    const a = normalizeTest({ id: "t1" });
    const b = normalizeTest({ id: "t1" });
    expect(a?.variants).toMatchObject({ count: 1, shuffleQuestions: true, shuffleOptions: true, duplex: false });
    expect(a?.variants.seed).toBe(b?.variants.seed);
    expect(normalizeTest({ id: "t2" })?.variants.seed).not.toBe(a?.variants.seed);
  });

  it("keeps the count between 1 and 6", () => {
    expect(normalizeTest({ id: "t", variants: { count: 99 } })?.variants.count).toBe(6);
    expect(normalizeTest({ id: "t", variants: { count: 0 } })?.variants.count).toBe(1);
  });
});

describe("normalizeTest (images and grids)", () => {
  it("repairs image placements and grids, and drops broken images", () => {
    const test = normalizeTest({
      id: "t",
      questions: [
        {
          id: "q1",
          type: "open-answer",
          images: [
            { id: "p1", imageId: "img1", width: 800, height: 600, widthPercent: 500, position: "sideways" },
            { id: "p2" }, // no imageId → dropped
          ],
          grid: { kind: "coordinates", cols: 999, rows: 1 },
        },
      ],
    });
    expect(test?.questions[0].images).toEqual([
      { id: "p1", imageId: "img1", width: 800, height: 600, widthPercent: 100, position: "above", caption: "" },
    ]);
    expect(test?.questions[0].grid).toEqual({ kind: "coordinates", cols: 34, rows: 2 });
  });
});
