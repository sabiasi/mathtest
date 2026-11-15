/** Matching questions: what is printed in each column, and the answers (pure; used by print and the Word export). */
import { optionLabel } from "@/lib/questions";
import { isRichTextEmpty } from "@/lib/richText";
import type { LabelStyle, MatchingQuestion } from "@/lib/storage/types";

/** The right column in the order shown on paper (shuffled by lib/variants.ts). */
export function matchingRightColumn(question: MatchingQuestion) {
  const items = [
    ...question.pairs.map((p) => ({ id: p.id, text: p.right })),
    ...question.extras.map((e) => ({ id: e.id, text: e.text })),
  ].filter((item) => !isRichTextEmpty(item.text));
  if (!question.shownOrder) return items;
  const byId = new Map(items.map((item) => [item.id, item]));
  return question.shownOrder.map((id) => byId.get(id)).filter((item) => item !== undefined);
}

/** Pairs that are filled in on both sides (empty rows aren't printed). */
export const matchingLeftColumn = (question: MatchingQuestion) =>
  question.pairs.filter((p) => !isRichTextEmpty(p.left) && !isRichTextEmpty(p.right));

/** For each left item (in order), the letter of its partner: ["ბ", "ა", "დ"]. */
export function matchingAnswers(question: MatchingQuestion, labelStyle: LabelStyle): string[] {
  const right = matchingRightColumn(question);
  return matchingLeftColumn(question).map((pair) => optionLabel(right.findIndex((item) => item.id === pair.id), labelStyle));
}
