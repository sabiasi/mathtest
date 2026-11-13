/**
 * Checks a test for things a teacher would want to fix before printing:
 * empty questions, multiple choice without enough answers or without the
 * correct one marked, and missing answers (which leave gaps in the key).
 */
import { isTextBlock, visibleOptions } from "@/lib/questions";
import { isRichTextEmpty } from "@/lib/richText";
import type { Test } from "@/lib/storage/types";

export type ProblemKind =
  | "noQuestions"
  | "empty"
  | "fewOptions"
  | "noCorrect"
  | "noAnswer"
  | "fewItems"
  | "noBlanks"
  | "noMap"
  | "noMarkers"
  | "noSource"
  | "emptyText"
  | "noGaps";

export type Problem = {
  kind: ProblemKind;
  /** Question number (1, 2, …) — 0 for problems about the whole test. */
  number: number;
  /** Only matters for the answer key (the student paper is fine). */
  keyOnly: boolean;
};

export function findProblems(test: Test): Problem[] {
  if (test.questions.length === 0) return [{ kind: "noQuestions", number: 0, keyOnly: false }];

  const problems: Problem[] = [];
  let next = 1; // question numbers skip texts (see questionNumbers in lib/questions.ts)
  test.questions.forEach((q) => {
    // Reading texts and poems have no number: their problem says "a text is empty".
    if (isTextBlock(q)) {
      if (!("body" in q) || !q.body.trim()) problems.push({ kind: "emptyText", number: 0, keyOnly: false });
      return;
    }
    const number = next++;
    if (isRichTextEmpty(q.text) && q.images.length === 0) problems.push({ kind: "empty", number, keyOnly: false });
    if (q.type === "multiple-choice") {
      if (visibleOptions(q).length < 2) problems.push({ kind: "fewOptions", number, keyOnly: false });
      else if (!visibleOptions(q).some((o) => o.id === q.correctOptionId)) problems.push({ kind: "noCorrect", number, keyOnly: true });
    }
    if (q.type === "true-false" && q.correct === null) problems.push({ kind: "noCorrect", number, keyOnly: true });
    if (q.type === "short-answer" && isRichTextEmpty(q.answer)) problems.push({ kind: "noAnswer", number, keyOnly: true });
    if (q.type === "matching" && q.pairs.filter((p) => !isRichTextEmpty(p.left) && !isRichTextEmpty(p.right)).length < 2) {
      problems.push({ kind: "fewItems", number, keyOnly: false });
    }
    if (q.type === "order" && q.items.filter((i) => !isRichTextEmpty(i.text)).length < 2) {
      problems.push({ kind: "fewItems", number, keyOnly: false });
    }
    if (q.type === "timeline") {
      if (q.events.length < 2) problems.push({ kind: "fewItems", number, keyOnly: false });
      else if (q.events.every((e) => e.hide === "none")) problems.push({ kind: "noBlanks", number, keyOnly: false });
    }
    if (q.type === "source" && isRichTextEmpty(q.source)) problems.push({ kind: "noSource", number, keyOnly: false });
    if (q.type === "fill-blank" && q.blanks.length === 0) problems.push({ kind: "noGaps", number, keyOnly: false });
    if (q.type === "mark-words" && q.marked.length === 0) problems.push({ kind: "noAnswer", number, keyOnly: true });
    if (q.type === "find-mistake" && q.items.some((item) => item.sentence.trim() && !item.mistake)) {
      problems.push({ kind: "noAnswer", number, keyOnly: true });
    }
    if (q.type === "grammar-table" && q.rows.filter((row) => row.word.trim()).length === 0) problems.push({ kind: "fewItems", number, keyOnly: false });
    if (q.type === "sentence-analysis" && (q.parts.length === 0 || !q.sentence.trim())) problems.push({ kind: "fewItems", number, keyOnly: false });
    if (q.type === "map") {
      if (!q.map) problems.push({ kind: "noMap", number, keyOnly: false });
      else if (q.markers.length === 0) problems.push({ kind: "noMarkers", number, keyOnly: false });
      else if (q.markers.some((m) => !m.answer.trim())) problems.push({ kind: "noAnswer", number, keyOnly: true });
    }
  });
  return problems;
}
