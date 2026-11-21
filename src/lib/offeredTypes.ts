/**
 * Which question types a teacher is OFFERED in a subject — the toolkit's list minus the
 * types switched off in HIDDEN_FOR_TESTING.questionTypes (src/lib/hiddenForTesting.ts).
 *
 * Hiding a type never breaks anything: saved tests that use it still open, edit and print
 * (every type keeps its editor and print code). Only NEW questions can't be of that type,
 * and the samples / templates leave those questions out (`withoutHiddenTypes`).
 *
 * Plain data only — no toolkits (they load toolbars that need a browser): the menu's list,
 * `offeredQuestionTypes`, lives in subjects/registry.ts.
 */
import { HIDDEN_FOR_TESTING } from "@/lib/hiddenForTesting";
import { isTextBlock } from "@/lib/questions";
import type { Question, QuestionType, Test } from "@/lib/storage/types";
import type { SubjectId } from "@/subjects/ids";

const HIDDEN: Partial<Record<SubjectId | "all", readonly QuestionType[]>> = HIDDEN_FOR_TESTING.questionTypes;

/** True when `type` is hidden in this subject. */
export function isTypeHidden(subjectId: SubjectId, type: QuestionType): boolean {
  return (HIDDEN.all ?? []).includes(type) || (HIDDEN[subjectId] ?? []).includes(type);
}

/**
 * A copy of a ready-made test (sample, template) without hidden question types, so a
 * teacher never meets a type they can't add themselves:
 * - a hidden short answer becomes an open question "on one line" (the same on paper);
 * - other hidden types are left out;
 * - a hidden LISTENING block takes the questions about it along (up to the next text
 *   block): questions about a recording nobody can play make no sense.
 * Returns the same object when nothing is hidden.
 */
export function withoutHiddenTypes(test: Test): Test {
  const subjectId = test.subjectId;
  if (!test.questions.some((q) => isTypeHidden(subjectId, q.type))) return test;
  const questions: Question[] = [];
  let skippingListening = false;
  for (const question of test.questions) {
    if (skippingListening && !isTextBlock(question)) continue;
    skippingListening = false;
    if (!isTypeHidden(subjectId, question.type)) {
      questions.push(question);
      continue;
    }
    if (question.type === "short-answer" && !isTypeHidden(subjectId, "open-answer")) {
      const { answer, ...rest } = question;
      questions.push({ ...rest, type: "open-answer", lines: 1, answerSpace: "short", ...(answer.length > 0 && { answer }) });
    } else if (question.type === "listening") {
      skippingListening = true;
    }
  }
  return { ...test, questions };
}
