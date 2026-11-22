import "server-only";
import { clientIp, createRateLimiter } from "@/lib/server/rateLimit";
import { billingSecret, serverDb, type ServerDb } from "@/lib/server/db";
import { sandboxAllowSubject } from "@/lib/server/sandbox";
import { fromOurSite } from "@/lib/payments/http";
import { isMissingSql } from "@/lib/payments/service";
import { getToolkit } from "@/subjects/registry";
import type { SubjectId } from "@/subjects/ids";
import { AI_MODEL, AiCutOff, AiRefused, Anthropic, aiConfigured, askClaude } from "./claude";
import { convertItems } from "./convert";
import { mockItems } from "./mock";
import { aiTypesFor, parseGenerateRequest, type AiError, type AiUsage, type GenerateAnswer, type GenerateRequest } from "./request";
import { readItems, type AiItem } from "./wire";

/**
 * The AI generator's server side:
 *   who is asking → have they asked too often → does their plan still allow
 *   it (counted in the database) → ask Claude (or mock mode) → check every
 *   question → hand back only valid ones.
 * A generation that fails, or gives nothing usable, is not counted.
 */

/** Abuse limits, on top of the monthly number of the plan. */
const perMinute = createRateLimiter({ limit: 6, windowMs: 60 * 1000 });
const perHour = createRateLimiter({ limit: 40, windowMs: 60 * 60 * 1000 });
const perIp = createRateLimiter({ limit: 30, windowMs: 60 * 1000 });
/** Reading "N of M left" is cheap, but not unlimited. */
const usageReads = createRateLimiter({ limit: 120, windowMs: 60 * 1000 });

const STATUS: Record<AiError, number> = { signIn: 401, tooMany: 429, limit: 403, subject: 403, notReady: 503, invalid: 400, topic: 400, types: 400, tooLong: 413, refused: 422, empty: 502, regenerations: 409, failed: 500 };

const refuse = (error: AiError, extra: Record<string, unknown> = {}, retryAfterSeconds?: number) =>
  Response.json({ error, ...extra }, { status: STATUS[error], headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined });

const offered = (subject: SubjectId) => aiTypesFor(getToolkit(subject).questionTypes);
const usageOf = (row: Record<string, unknown>): AiUsage => ({ used: Number(row.used ?? 0), limit: Number(row.limit ?? 0), plan: String(row.plan ?? "free") });

type Signed = { db: ServerDb & { user: NonNullable<ServerDb["user"]> }; secret: string };

async function signedIn(): Promise<Signed | Response> {
  const db = await serverDb();
  const secret = billingSecret();
  if (!db || !secret) return refuse("notReady");
  if (!db.user) return refuse("signIn");
  return { db: db as Signed["db"], secret };
}

export async function usageResponse(request: Request): Promise<Response> {
  if (!usageReads.check(clientIp(request.headers)).ok) return refuse("tooMany");
  const who = await signedIn();
  if (who instanceof Response) return who;
  try {
    const row = await who.db.rpc<Record<string, unknown>>("ai_status", { secret: who.secret, uid: who.db.user.id });
    return Response.json({ ...usageOf(row), mock: !aiConfigured() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!isMissingSql(error)) console.error("Rapido: could not read the AI usage", error);
    return refuse("notReady");
  }
}

async function produce(request: GenerateRequest, one: boolean, shift: number): Promise<{ items: AiItem[]; model: string; inputTokens: number | null; outputTokens: number | null }> {
  if (!aiConfigured()) return { items: mockItems(request, shift), model: "mock", inputTokens: null, outputTokens: null };
  const answer = await askClaude(request, one);
  return { items: readItems(answer.data), model: answer.model, inputTokens: answer.inputTokens, outputTokens: answer.outputTokens };
}

function errorCode(error: unknown): { code: AiError; retryAfter?: number } {
  if (error instanceof AiRefused) return { code: "refused" };
  if (error instanceof AiCutOff) return { code: "empty" };
  // Most specific first: "Anthropic is busy" is worth trying again, a bad request is not.
  if (error instanceof Anthropic.RateLimitError) return { code: "tooMany", retryAfter: 30 };
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return { code: "notReady" };
  if (error instanceof Anthropic.APIError) return { code: "failed" };
  return { code: "failed" };
}

export async function generateResponse(request: Request): Promise<Response> {
  if (!fromOurSite(request)) return refuse("invalid");
  let limit = perIp.check(`ip:${clientIp(request.headers)}`);
  if (!limit.ok) return refuse("tooMany", {}, limit.retryAfterSeconds);
  const who = await signedIn();
  if (who instanceof Response) return who;
  const { db, secret } = who;
  limit = perMinute.check(db.user.id);
  if (limit.ok) limit = perHour.check(db.user.id);
  if (!limit.ok) return refuse("tooMany", {}, limit.retryAfterSeconds);

  const text = await request.text().catch(() => "");
  if (text.length > 20_000) return refuse("tooLong");
  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = null;
  }
  const parsed = parseGenerateRequest(body, offered);
  if ("problem" in parsed) return refuse(parsed.problem);
  const regenerateOf = Number.isInteger(body?.regenerateOf) ? Number(body!.regenerateOf) : null;
  const wanted: GenerateRequest = regenerateOf === null ? parsed : { ...parsed, count: 1 };
  const mock = !aiConfigured();

  try {
    if (db.sandbox) await sandboxAllowSubject(db.user.id, wanted.subject);
    let usageId = regenerateOf;
    let usage: AiUsage | null = null;
    if (regenerateOf !== null) {
      // "Make this one again": free, a few times per generation.
      const allowed = await db.rpc<{ ok?: boolean }>("ai_regenerate", { secret, uid: db.user.id, usage_id: regenerateOf });
      if (!allowed.ok) return refuse("regenerations");
    } else {
      // Counted BEFORE the AI is asked, in the database: two clicks at once can't both take the last one.
      const taken = await db.rpc<Record<string, unknown>>("ai_consume", { secret, uid: db.user.id, subject: wanted.subject, question_count: wanted.count, is_mock: mock, model: mock ? "mock" : AI_MODEL });
      usage = usageOf(taken);
      if (taken.error === "limit") return refuse("limit", { usage });
      if (taken.error) return refuse(taken.error === "subject" ? "subject" : "failed", { usage });
      usageId = Number(taken.usage_id);
    }
    const finish = async (succeeded: boolean, input: number | null = null, output: number | null = null, kept: number | null = null) => {
      if (regenerateOf !== null) return usage;
      const row = await db.rpc<Record<string, unknown>>("ai_finish", { secret, usage_id: usageId, succeeded, input_tokens: input, output_tokens: output, kept });
      return row.error ? usage : usageOf(row);
    };

    let made;
    try {
      made = await produce(wanted, regenerateOf !== null, Number(body?.shift) || 0);
    } catch (error) {
      const { code, retryAfter } = errorCode(error);
      // Never log the request or the answer: only what kind of problem it was.
      console.error(`Rapido: the AI generator failed (${code})`, error instanceof Error ? error.name : "");
      return refuse(code, { usage: await finish(false) }, retryAfter);
    }

    const { questions, dropped } = convertItems(made.items, { subject: wanted.subject, language: wanted.language, allowed: wanted.types, limit: wanted.count });
    if (dropped.length > 0) console.info(`Rapido: AI generator left out ${dropped.length} item(s): ${dropped.join("; ")}`);
    if (questions.length === 0) return refuse("empty", { usage: await finish(false, made.inputTokens, made.outputTokens, 0) });
    usage = await finish(true, made.inputTokens, made.outputTokens, questions.length);
    const answer: GenerateAnswer = { questions, usage, usageId: usageId!, mock, leftOut: dropped.length };
    return Response.json(answer);
  } catch (error) {
    if (isMissingSql(error)) return refuse("notReady");
    console.error("Rapido: the AI generator failed", error instanceof Error ? error.name : "");
    return refuse("failed");
  }
}


