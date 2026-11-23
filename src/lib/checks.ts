/**
 * Checks a test for things a teacher would want to fix before printing:
 * empty questions, multiple choice without enough answers or without the
 * correct one marked, and missing answers (which leave gaps in the key).
 */
import { checkBalance } from "@/lib/chem";
import { cross } from "@/lib/genetics";
import { looseLeads } from "@/lib/dichotomous";
import { readSequence } from "@/lib/molecular";
import { buildCrossword, buildWordSearch } from "@/lib/puzzles";
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
  | "noPicture"
  | "badGenotype"
  | "badSequence"
  | "looseKey"
  | "noLabels"
  | "noSource"
  | "emptyText"
  | "noGaps"
  | "unbalanced"
  | "puzzleUnplaced"
  | "noClue";

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
      if ((q.type === "passage" || q.type === "poem") && !q.body.trim()) problems.push({ kind: "emptyText", number: 0, keyOnly: false });
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
    // An open answer "on one line" is a short answer: it needs one too (other open answers may have none).
    if (q.type === "open-answer" && q.answerSpace === "short" && isRichTextEmpty(q.answer ?? [])) problems.push({ kind: "noAnswer", number, keyOnly: true });
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
    if (q.type === "balance") {
      const written = q.equations.filter((e) => e.balanced.trim());
      if (written.length === 0) problems.push({ kind: "fewItems", number, keyOnly: false });
      // The key would show wrong coefficients if the "balanced" equation isn't.
      else if (written.some((e) => checkBalance(e.balanced).status !== "balanced")) problems.push({ kind: "unbalanced", number, keyOnly: true });
    }
    if (q.type === "fill-blank" && q.mode === "choice" && q.blanks.some((b) => (b.options ?? []).filter((o) => o.trim()).length === 0)) {
      problems.push({ kind: "fewOptions", number, keyOnly: false });
    }
    if ((q.type === "transformation" || q.type === "word-formation") && q.items.filter((i) => ("original" in i ? i.original : i.sentence).trim()).length === 0) {
      problems.push({ kind: "fewItems", number, keyOnly: false });
    }
    if (q.type === "word-formation" && q.items.some((i) => i.sentence.trim() && (!i.gap || !i.root.trim()))) problems.push({ kind: "noGaps", number, keyOnly: false });
    if (q.type === "picture-match" && q.pictures.length === 0) problems.push({ kind: "fewItems", number, keyOnly: false });
    // A picture without its word: blank on the key (and missing from the word box).
    else if (q.type === "picture-match" && q.pictures.some((p) => !p.answer.trim())) problems.push({ kind: "noAnswer", number, keyOnly: !q.wordBank });
    if (q.type === "odd-one-out" && !q.rows.some((r) => r.words.some((w) => w.trim()))) problems.push({ kind: "fewItems", number, keyOnly: false });
    if (q.type === "odd-one-out" && q.rows.some((r) => r.words.some((w) => w.trim()) && r.odd === null)) problems.push({ kind: "noCorrect", number, keyOnly: true });
    if (q.type === "crossword") {
      const words = q.entries.filter((e) => e.word.trim());
      if (words.length < 2) problems.push({ kind: "fewItems", number, keyOnly: false });
      else if (buildCrossword(q.entries, q.seed).unplaced.length > 0) problems.push({ kind: "puzzleUnplaced", number, keyOnly: false });
      // A word without a clue: students get a number and nothing to go on.
      if (words.some((e) => !e.clue.trim())) problems.push({ kind: "noClue", number, keyOnly: false });
    }
    if (q.type === "word-search") {
      if (q.words.filter((w) => w.trim()).length < 2) problems.push({ kind: "fewItems", number, keyOnly: false });
      else if (buildWordSearch(q.words, q.size, q.allDirections, q.seed).unplaced.length > 0) problems.push({ kind: "puzzleUnplaced", number, keyOnly: false });
    }
    if (q.type === "sentence-analysis" && (q.parts.length === 0 || !q.sentence.trim())) problems.push({ kind: "fewItems", number, keyOnly: false });
    if (q.type === "punnett" && !cross(q.mother, q.father).ok) problems.push({ kind: "badGenotype", number, keyOnly: false });
    if (q.type === "sequence") {
      if (!readSequence(q.given).ok) problems.push({ kind: "badSequence", number, keyOnly: false });
      else if (q.tasks.length === 0) problems.push({ kind: "fewItems", number, keyOnly: false });
    }
    if (q.type === "food-web" && q.organisms.length < 2) problems.push({ kind: "fewItems", number, keyOnly: false });
    if (q.type === "food-web" && q.organisms.some((o) => !o.name.trim())) problems.push({ kind: "noAnswer", number, keyOnly: true });
    if (q.type === "pyramid" && q.levels.length < 2) problems.push({ kind: "fewItems", number, keyOnly: false });
    if (q.type === "dichotomous-key") {
      if (q.couplets.length === 0) problems.push({ kind: "fewItems", number, keyOnly: false });
      else if (looseLeads(q.couplets) > 0) problems.push({ kind: "looseKey", number, keyOnly: false });
    }
    if (q.type === "taxonomy" && q.ranks.some((r) => r.hide && !r.value.trim())) problems.push({ kind: "noAnswer", number, keyOnly: true });
    if (q.type === "scale-calc" && q.rows.every((r) => r.value <= 0) && !q.askConvert) problems.push({ kind: "fewItems", number, keyOnly: false });
    if (q.type === "climate-chart") {
      if (q.temperature.every((v) => v === 0) && q.precipitation.every((v) => v === 0)) problems.push({ kind: "fewItems", number, keyOnly: false });
    }
    if (q.type === "pedigree") {
      if (q.people.length === 0) problems.push({ kind: "fewItems", number, keyOnly: false });
      else if (q.people.some((p) => p.ask && !p.answer.trim())) problems.push({ kind: "noAnswer", number, keyOnly: true });
    }
    if (q.type === "label-diagram") {
      if (!q.picture) problems.push({ kind: "noPicture", number, keyOnly: false });
      else if (q.labels.length === 0) problems.push({ kind: "noLabels", number, keyOnly: false });
      else if (q.labels.some((l) => !l.answer.trim())) problems.push({ kind: "noAnswer", number, keyOnly: true });
    }
    if (q.type === "map") {
      if (!q.map) problems.push({ kind: "noMap", number, keyOnly: false });
      else if (q.markers.length === 0) problems.push({ kind: "noMarkers", number, keyOnly: false });
      else if (q.markers.some((m) => !m.answer.trim())) problems.push({ kind: "noAnswer", number, keyOnly: true });
    }
  });
  return problems;
}
