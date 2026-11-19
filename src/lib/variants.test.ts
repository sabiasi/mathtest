import { describe, expect, it } from "vitest";
import { createQuestion, correctOptionLabel } from "./questions";
import type { MatchingQuestion, MultipleChoiceQuestion, OrderQuestion, Question, Test } from "./storage/types";
import { buildVariants, seededRandom, shuffle, shuffleAroundTexts } from "./variants";

const text = (t: string) => [{ type: "text" as const, text: t }];

function mc(id: string, lock = false): MultipleChoiceQuestion {
  const q = createQuestion("multiple-choice", { id, text: text(id) }) as MultipleChoiceQuestion;
  const options = ["a", "b", "c", "d"].map((x) => ({ id: `${id}-${x}`, text: text(x) }));
  return { ...q, options, correctOptionId: `${id}-c`, lockOptions: lock };
}

function makeTest(questions: Question[], variants: Partial<Test["variants"]> = {}): Test {
  return {
    id: "t", schoolName: "", title: "", subjectId: "math", subject: "", grade: "", level: "", date: "", timeLimitMinutes: null,
    instructions: "", labelStyle: "latin", questions,
    printOptions: { fontSize: "normal", showPoints: true, columns: 1, bilingual: false },
    variants: { count: 4, shuffleQuestions: true, shuffleOptions: true, seed: 42, duplex: false, ...variants },
    folder: "", createdAt: "", updatedAt: "",
  };
}

const questions = () => [mc("q1"), mc("q2"), createQuestion("true-false", { id: "q3" }), mc("q4"), mc("q5")];
const ids = (t: Test) => t.questions.map((q) => q.id);
const optionIds = (q: Question) => (q.type === "multiple-choice" ? q.options.map((o) => o.id) : []);

describe("seededRandom / shuffle", () => {
  it("gives the same sequence for the same seed", () => {
    expect(shuffle([1, 2, 3, 4, 5, 6], seededRandom(7))).toEqual(shuffle([1, 2, 3, 4, 5, 6], seededRandom(7)));
  });
  it("keeps every item exactly once", () => {
    expect(shuffle([1, 2, 3, 4, 5, 6], seededRandom(9)).sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("buildVariants", () => {
  it("makes only the original when count is 1", () => {
    const test = makeTest(questions(), { count: 1 });
    expect(buildVariants(test)).toEqual([{ label: "I", test }]);
  });

  it("keeps variant A exactly as the teacher wrote it", () => {
    const test = makeTest(questions());
    expect(buildVariants(test)[0].test).toEqual(test);
  });

  it("shuffles chronological-order items in every variant, never into the answer", () => {
    const order: OrderQuestion = {
      ...(createQuestion("order", { id: "o" }) as OrderQuestion),
      items: ["1", "2", "3", "4"].map((id) => ({ id, text: text(id) })),
    };
    const variants = buildVariants(makeTest([order, mc("q2")]));
    for (const variant of variants) {
      const shown = (variant.test.questions.find((q) => q.id === "o") as OrderQuestion).shownOrder!;
      expect([...shown].sort()).toEqual(["1", "2", "3", "4"]);
      expect(shown).not.toEqual(["1", "2", "3", "4"]);
    }
    // Repeatable: the same seed gives the same papers.
    expect(buildVariants(makeTest([order, mc("q2")]))).toEqual(variants);
  });

  it("shuffles the matching column (with extras) so pair 1 isn't simply ა", () => {
    const base = createQuestion("matching", { id: "m" }) as MatchingQuestion;
    const matching: MatchingQuestion = {
      ...base,
      pairs: ["p1", "p2", "p3"].map((id) => ({ id, left: text(id), right: text(id) })),
      extras: [{ id: "x1", text: text("extra") }],
    };
    const [a] = buildVariants(makeTest([matching], { count: 1 }));
    const shown = (a.test.questions[0] as MatchingQuestion).shownOrder!;
    expect([...shown].sort()).toEqual(["p1", "p2", "p3", "x1"]);
    expect(shown.filter((id) => id !== "x1")).not.toEqual(["p1", "p2", "p3"]);
  });

  it("makes A, B, C, D that are all different", () => {
    const variants = buildVariants(makeTest(questions()));
    expect(variants.map((v) => v.label)).toEqual(["I", "II", "III", "IV"]);
    const arrangements = variants.map((v) => JSON.stringify(v.test.questions.map((q) => [q.id, optionIds(q)])));
    expect(new Set(arrangements).size).toBe(4);
  });

  it("is repeatable: same seed → same variants; new seed → different", () => {
    const a = buildVariants(makeTest(questions()));
    const b = buildVariants(makeTest(questions()));
    const c = buildVariants(makeTest(questions(), { seed: 43 }));
    expect(a).toEqual(b);
    expect(a.map((v) => ids(v.test))).not.toEqual(c.map((v) => ids(v.test)));
  });

  it("keeps every question and option exactly once, and the right answer right", () => {
    for (const variant of buildVariants(makeTest(questions()))) {
      expect([...ids(variant.test)].sort()).toEqual(["q1", "q2", "q3", "q4", "q5"]);
      for (const q of variant.test.questions) {
        if (q.type !== "multiple-choice") continue;
        expect([...optionIds(q)].sort()).toEqual([`${q.id}-a`, `${q.id}-b`, `${q.id}-c`, `${q.id}-d`]);
        // The correct option is still option "c" (by id), wherever it moved.
        const correct = q.options.find((o) => o.id === q.correctOptionId);
        expect(correct?.text).toEqual(text("c"));
      }
    }
  });

  it("moves the correct letter around in multiple choice", () => {
    const letters = buildVariants(makeTest(questions())).map((v) =>
      v.test.questions.filter((q) => q.type === "multiple-choice").map((q) => correctOptionLabel(q as MultipleChoiceQuestion, "latin")).join(""),
    );
    expect(letters[0]).toBe("CCCC"); // original: always option c
    expect(new Set(letters).size).toBeGreaterThan(1);
  });

  it("only shuffles questions when options shuffling is off", () => {
    for (const v of buildVariants(makeTest(questions(), { shuffleOptions: false }))) {
      for (const q of v.test.questions) {
        if (q.type === "multiple-choice") expect(optionIds(q)).toEqual([`${q.id}-a`, `${q.id}-b`, `${q.id}-c`, `${q.id}-d`]);
      }
    }
  });

  it("only shuffles options when question shuffling is off", () => {
    for (const v of buildVariants(makeTest(questions(), { shuffleQuestions: false }))) {
      expect(ids(v.test)).toEqual(["q1", "q2", "q3", "q4", "q5"]);
    }
  });

  it("never reorders locked options", () => {
    const test = makeTest([mc("q1", true), mc("q2"), mc("q3", true)]);
    for (const v of buildVariants(test)) {
      for (const q of v.test.questions) {
        if (q.type === "multiple-choice" && q.lockOptions) {
          expect(optionIds(q)).toEqual([`${q.id}-a`, `${q.id}-b`, `${q.id}-c`, `${q.id}-d`]);
        }
      }
    }
  });
});

describe("shuffleAroundTexts", () => {
  it("keeps reading texts in place and shuffles only the questions between them", () => {
    const q = (id: string) => createQuestion("true-false", { id });
    const text = (id: string) => createQuestion("passage", { id });
    const questions = [text("T1"), q("a"), q("b"), q("c"), text("T2"), q("d"), q("e")];
    for (let seed = 1; seed < 20; seed++) {
      const ids = shuffleAroundTexts(questions, seededRandom(seed)).map((x) => x.id);
      expect(ids[0]).toBe("T1");
      expect(ids[4]).toBe("T2");
      expect(ids.slice(1, 4).sort()).toEqual(["a", "b", "c"]);
      expect(ids.slice(5).sort()).toEqual(["d", "e"]);
    }
  });
});

describe("gap fill in variants", () => {
  it("shuffles the word box and each gap's choices, but not the gaps", async () => {
    const { buildVariants: build } = await import("./variants");
    const q = {
      ...createQuestion("fill-blank", { id: "f" }),
      body: "I go to school and she goes home.",
      mode: "choice",
      blanks: [
        { word: "go", occurrence: 0, hint: "", options: ["goes", "went", "going"] },
        { word: "goes", occurrence: 0, hint: "", options: ["go", "gone", "went"] },
      ],
      extras: ["run"],
    } as Question;
    const [a] = build(makeTest([q], { count: 1 }));
    const shown = a.test.questions[0];
    if (shown.type !== "fill-blank") throw new Error("type");
    expect([...(shown.shownBank ?? [])].sort()).toEqual(["go", "goes", "run"]);
    expect(shown.shownChoices?.map((c) => [...c].sort())).toEqual([
      ["go", "goes", "going", "went"],
      ["go", "goes", "gone", "went"],
    ]);
    expect(shown.blanks.map((b) => b.word)).toEqual(["go", "goes"]); // gaps keep their order
  });
});

describe("buildVariants with a plan limit", () => {
  it("prints at most `limit` variants, and the first ones are the same as without a limit", () => {
    const test = makeTest(questions(), { count: 5 });
    const all = buildVariants(test);
    const limited = buildVariants(test, 2);
    expect(limited.map((v) => v.label)).toEqual(["I", "II"]);
    expect(limited.map((v) => ids(v.test))).toEqual(all.slice(0, 2).map((v) => ids(v.test)));
    // The test's own setting is untouched.
    expect(test.variants.count).toBe(5);
  });
});
