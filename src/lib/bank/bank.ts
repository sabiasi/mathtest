/**
 * The personal question bank (Premium): questions a teacher saved to use
 * again. Pure helpers — no database and no React here (see bankStore.ts).
 *
 * A bank item is ONE question, exactly as the editor stores it inside a
 * test, plus what it is filed under: subject, grade and the teacher's tags.
 */
import { usedImageIds } from "@/lib/images/imageMath";
import { duplicateQuestion, QUESTION_TYPES } from "@/lib/questions";
import { normalizeTest } from "@/lib/storage/migrate";
import type { LabelStyle, Question, QuestionType, Test } from "@/lib/storage/types";
import { SUBJECT_IDS, type SubjectId } from "@/subjects/ids";

export type BankItem = {
  id: string;
  subject: SubjectId;
  grade: string;
  type: QuestionType;
  tags: string[];
  question: Question;
  createdAt: string;
};

export const MAX_TAGS = 12;
export const MAX_TAG_LENGTH = 30;
/** The database refuses more (supabase/schema.sql, check_bank_question). */
export const MAX_BANK_QUESTIONS = 2000;

/** "algebra, 7th grade ,Algebra" → ["algebra", "7th grade"]. */
export function parseTags(text: string): string[] {
  const tags: string[] = [];
  for (const part of text.split(/[,;\n]/)) {
    const tag = part.trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);
    if (tag && !tags.some((t) => t.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  }
  return tags.slice(0, MAX_TAGS);
}

/** The question's words (formulas as their LaTeX) on one line, for searching. */
export function summaryOf(question: Question): string {
  const text = question.text.map((segment) => (segment.type === "text" ? segment.text : ` ${segment.latex} `)).join("");
  return text.replace(/\s+/g, " ").trim().slice(0, 300);
}

/** A test that holds just these questions: lets the print code (and normalizeTest) work on bank questions. */
export function wrapQuestions(questions: unknown[], subject: SubjectId, labelStyle: LabelStyle = "georgian", grade = ""): Test | null {
  return normalizeTest({ id: "bank-preview", subjectId: subject, grade, labelStyle, questions });
}

/** A row of the `bank_questions` table → a checked bank item (null = not usable). */
export function bankItemFromRow(raw: unknown): BankItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || !SUBJECT_IDS.includes(row.subject as SubjectId)) return null;
  const subject = row.subject as SubjectId;
  // The same repair every saved test gets: a broken question is left out, never shown broken.
  const question = wrapQuestions([row.data], subject)?.questions[0];
  if (!question || !QUESTION_TYPES.includes(question.type)) return null;
  return {
    id: row.id,
    subject,
    grade: typeof row.grade === "string" ? row.grade : "",
    type: question.type,
    tags: Array.isArray(row.tags) ? parseTags(row.tags.filter((tag) => typeof tag === "string").join(",")) : [],
    question,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString(),
  };
}

/** What is saved: a copy of the question without the editor-only tip. */
export function questionForBank(question: Question): Question {
  const copy = structuredClone(question);
  delete copy.tip;
  return copy;
}

/** What goes into a test: a copy with new ids, so the bank's own question never changes. */
export function questionFromBank(item: BankItem): Question {
  return duplicateQuestion(structuredClone(item.question));
}

/** Pictures used by bank questions (picture clean-up must keep them). */
export function bankImageIds(items: BankItem[]): string[] {
  const test = wrapQuestions([], "math");
  if (!test) return [];
  return [...usedImageIds([{ ...test, questions: items.map((item) => item.question) }])];
}

export type BankFilter = { search?: string; subject?: SubjectId | ""; grade?: string; type?: QuestionType | ""; tag?: string };

export function filterBank(items: BankItem[], filter: BankFilter): BankItem[] {
  const words = (filter.search ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (filter.subject && item.subject !== filter.subject) return false;
    if (filter.grade && item.grade !== filter.grade) return false;
    if (filter.type && item.type !== filter.type) return false;
    if (filter.tag && !item.tags.includes(filter.tag)) return false;
    if (words.length === 0) return true;
    const haystack = `${summaryOf(item.question)} ${item.tags.join(" ")}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

/** The values to offer in the filter menus: only what the bank really contains. */
export function bankFacets(items: BankItem[]) {
  const unique = <T,>(values: T[]) => [...new Set(values)];
  return {
    subjects: SUBJECT_IDS.filter((id) => items.some((item) => item.subject === id)),
    grades: unique(items.map((item) => item.grade).filter(Boolean)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    types: QUESTION_TYPES.filter((type) => items.some((item) => item.type === type)),
    tags: unique(items.flatMap((item) => item.tags)).sort((a, b) => a.localeCompare(b)),
  };
}
