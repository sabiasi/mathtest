import { describe, expect, it } from "vitest";
import { findProblems } from "./checks";
import { createQuestion } from "./questions";
import type { MultipleChoiceQuestion, Question, Test } from "./storage/types";

const text = (t: string) => [{ type: "text" as const, text: t }];
const testOf = (questions: Question[]) => ({ questions }) as unknown as Test;

describe("findProblems", () => {
  it("reports a test without questions", () => {
    expect(findProblems(testOf([]))).toEqual([{ kind: "noQuestions", number: 0, keyOnly: false }]);
  });

  it("finds empty questions and missing answers, with question numbers", () => {
    const good = { ...createQuestion("true-false"), text: text("π > 3"), correct: true } as Question;
    const empty = createQuestion("open-answer");
    const tf = { ...createQuestion("true-false"), text: text("?") };
    const short = { ...createQuestion("short-answer"), text: text("2+2=?") };
    expect(findProblems(testOf([good, empty, tf, short]))).toEqual([
      { kind: "empty", number: 2, keyOnly: false },
      { kind: "noCorrect", number: 3, keyOnly: true },
      { kind: "noAnswer", number: 4, keyOnly: true },
    ]);
  });

  it("checks multiple choice: at least 2 answers, and the correct one marked", () => {
    const mc = createQuestion("multiple-choice", { text: text("?") }) as MultipleChoiceQuestion;
    const few = { ...mc, options: [{ id: "a", text: text("1") }, { id: "b", text: [] }] };
    const unmarked = { ...mc, options: [{ id: "a", text: text("1") }, { id: "b", text: text("2") }] };
    const ok = { ...unmarked, correctOptionId: "b" };
    expect(findProblems(testOf([few, unmarked, ok]))).toEqual([
      { kind: "fewOptions", number: 1, keyOnly: false },
      { kind: "noCorrect", number: 2, keyOnly: true },
    ]);
  });

  it("a question with only a picture is not empty", () => {
    const pic = { ...createQuestion("open-answer"), images: [{ id: "p", imageId: "i", width: 1, height: 1, widthPercent: 50, position: "above" as const, caption: "" }] };
    expect(findProblems(testOf([pic]))).toEqual([]);
  });

  it("checks the history and matching questions", () => {
    const withText = <T extends Question>(q: T) => ({ ...q, text: text("?") });
    const matching = withText(createQuestion("matching")); // 3 empty pairs
    const timeline = withText(createQuestion("timeline"));
    const allShown = timeline.type === "timeline" ? { ...timeline, events: timeline.events.map((e) => ({ ...e, hide: "none" as const })) } : timeline;
    const source = withText(createQuestion("source"));
    const map = withText(createQuestion("map"));
    expect(findProblems(testOf([matching, timeline, allShown, source, map])).map((p) => p.kind)).toEqual([
      "fewItems",
      "noBlanks",
      "noSource",
      "noMap",
    ]);
  });

  it("checks the English vocabulary tasks: words under pictures, odd-one-out rows, crossword clues", () => {
    const picture = { id: "p", imageId: "i", width: 1, height: 1 };
    const pictures = { ...createQuestion("picture-match"), text: text("Write the words."), pictures: [{ ...picture, answer: "cup" }, { ...picture, id: "q", answer: "" }] };
    const noBank = { ...pictures, wordBank: false };
    const odd = { ...createQuestion("odd-one-out"), text: text("Circle the odd one.") };
    const crossword = {
      ...createQuestion("crossword"),
      text: text("Solve it."),
      entries: [
        { id: "a", word: "TENT", clue: "You sleep in it." },
        { id: "b", word: "TEACHER", clue: "" },
      ],
    };
    expect(findProblems(testOf([pictures, noBank, odd, crossword] as Question[]))).toEqual([
      { kind: "noAnswer", number: 1, keyOnly: false }, // the word box misses it too
      { kind: "noAnswer", number: 2, keyOnly: true },
      { kind: "fewItems", number: 3, keyOnly: false },
      { kind: "noClue", number: 4, keyOnly: false },
    ]);
  });
});
