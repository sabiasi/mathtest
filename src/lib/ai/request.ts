/**
 * What a teacher asks the AI generator for, and the checks on it.
 * Pure (no server, no React): the dialog and the route both use it.
 */
import type { Language } from "@/i18n/dictionaries";
import type { QuestionType } from "@/lib/storage/types";
import { SUBJECT_IDS, type SubjectId } from "@/subjects/ids";

/**
 * Question types the AI can write. Types that need a picture, a drawing or a
 * hand-made layout (maps, diagrams, crosswords…) are left to the teacher.
 * A subject offers the ones its own toolkit has (`aiTypesFor`).
 */
export const AI_TYPES = ["multiple-choice", "true-false", "short-answer", "open-answer", "matching", "fill-blank", "order", "given-find", "balance"] as const satisfies readonly QuestionType[];
export type AiType = (typeof AI_TYPES)[number];

export const aiTypesFor = (questionTypes: readonly QuestionType[]): AiType[] => AI_TYPES.filter((type) => questionTypes.includes(type));

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const AI_LIMITS = {
  maxQuestions: 10,
  topicLength: 200,
  gradeLength: 40,
  /** Pasted text ("make questions from this"): refused when longer, never cut silently. */
  sourceLength: 8000,
};

export type GenerateRequest = {
  subject: SubjectId;
  grade: string;
  topic: string;
  types: AiType[];
  count: number;
  difficulty: Difficulty;
  language: Language;
  source: string;
};

export type RequestProblem = "invalid" | "topic" | "types" | "tooLong";

/** Checks what the browser sent. `offered` = the AI types of that subject's toolkit. */
export function parseGenerateRequest(body: unknown, offered: (subject: SubjectId) => AiType[]): GenerateRequest | { problem: RequestProblem } {
  if (!body || typeof body !== "object") return { problem: "invalid" };
  const raw = body as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  if (!SUBJECT_IDS.includes(raw.subject as SubjectId)) return { problem: "invalid" };
  const subject = raw.subject as SubjectId;
  const topic = text(raw.topic);
  const source = text(raw.source);
  if (topic.length > AI_LIMITS.topicLength || source.length > AI_LIMITS.sourceLength || text(raw.grade).length > AI_LIMITS.gradeLength) return { problem: "tooLong" };
  // Something to work from: a topic, or a text to make questions about.
  if (topic.length < 2 && source.length < 20) return { problem: "topic" };
  const allowed = offered(subject);
  const types = Array.isArray(raw.types) ? allowed.filter((type) => (raw.types as unknown[]).includes(type)) : [];
  if (types.length === 0) return { problem: "types" };
  const count = typeof raw.count === "number" ? raw.count : NaN;
  if (!Number.isInteger(count) || count < 1 || count > AI_LIMITS.maxQuestions) return { problem: "invalid" };
  return {
    subject,
    grade: text(raw.grade),
    topic,
    types,
    count,
    difficulty: DIFFICULTIES.includes(raw.difficulty as Difficulty) ? (raw.difficulty as Difficulty) : "medium",
    language: raw.language === "en" ? "en" : "ka",
    source,
  };
}

/** Error codes of /api/ai/generate; each has a message in the dictionaries (`ai.error.<code>`). */
export const AI_ERRORS = ["signIn", "tooMany", "limit", "subject", "notReady", "invalid", "topic", "types", "tooLong", "refused", "empty", "regenerations", "failed"] as const;
export type AiError = (typeof AI_ERRORS)[number];
export const asAiError = (code: unknown): AiError => (AI_ERRORS.includes(code as AiError) ? (code as AiError) : "failed");

export type AiUsage = { used: number; limit: number; plan: string };

/** What POST /api/ai/generate answers with. */
export type GenerateAnswer = { questions: import("@/lib/storage/types").Question[]; usage: AiUsage | null; usageId: number; mock: boolean; leftOut: number };
