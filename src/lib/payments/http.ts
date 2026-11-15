import "server-only";
import { timingSafeEqual } from "node:crypto";
import { clientIp, createRateLimiter, type LimitResult } from "@/lib/server/rateLimit";
import { serverDb, type ServerDb } from "@/lib/server/db";
import { siteOrigin } from "./config";
import { isMissingSql } from "./service";
import type { BillingError } from "./summary";

/** Small shared pieces for the billing routes (src/app/api/billing/…). */

const STATUS: Record<BillingError, number> = {
  signIn: 401,
  disabled: 503,
  tooMany: 429,
  alreadySubscribed: 409,
  notReady: 503,
  provider: 502,
  invalid: 400,
  noSubscription: 409,
  ended: 409,
  newCheckoutNeeded: 409,
  failed: 500,
};

export const ok = (body: Record<string, unknown> = {}) => Response.json({ ok: true, ...body });

export function refuse(error: BillingError, retryAfterSeconds?: number): Response {
  return Response.json({ error }, { status: STATUS[error], headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined });
}

/** Turns a thrown error into an answer: "the SQL isn't installed yet" is not a crash. */
export function refuseError(error: unknown, what: string): Response {
  if (isMissingSql(error)) return refuse("notReady");
  console.error(`MathTest: ${what} failed`, error);
  return refuse("failed");
}

export async function readJson(request: Request, maxBytes = 10_000): Promise<Record<string, unknown> | null> {
  const text = await request.text().catch(() => "");
  if (text.length > maxBytes) return null;
  try {
    const body: unknown = text ? JSON.parse(text) : {};
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * A request that changes something must come from our own pages. (Browsers
 * send the "Origin" header with every POST; another website can't fake it.)
 */
export function fromOurSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).host === (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host);
  } catch {
    return false;
  }
}

/** Each signed-in teacher: 10 billing actions per 10 minutes; each address: 30. */
const perUser = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });
const perIp = createRateLimiter({ limit: 30, windowMs: 10 * 60 * 1000 });

export type BillingContext = { db: ServerDb & { user: NonNullable<ServerDb["user"]> }; origin: string };

/** The start of every "teacher does something about their plan" route: our site, signed in, not too often. */
export async function teacherAction(request: Request): Promise<BillingContext | Response> {
  if (!fromOurSite(request)) return refuse("invalid");
  let limit: LimitResult = perIp.check(`ip:${clientIp(request.headers)}`);
  if (!limit.ok) return refuse("tooMany", limit.retryAfterSeconds);
  const db = await serverDb();
  if (!db) return refuse("disabled");
  if (!db.user) return refuse("signIn");
  limit = perUser.check(`user:${db.user.id}`);
  if (!limit.ok) return refuse("tooMany", limit.retryAfterSeconds);
  return { db: db as BillingContext["db"], origin: siteOrigin(request) };
}

/** Compares two secrets without leaking, through timing, how many characters matched. */
export function secretsMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}
