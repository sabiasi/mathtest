import "server-only";
import { fromOurSite, readJson } from "@/lib/payments/http";
import { isMissingSql } from "@/lib/payments/service";
import { serverDb, type ServerDb } from "@/lib/server/db";
import { clientIp, createRateLimiter, type LimitResult } from "@/lib/server/rateLimit";

/**
 * Shared pieces of the school routes (/api/school/…) and the founders' admin
 * routes (/api/admin/…). The routes are thin: who may do what is decided by
 * the database functions they call (supabase/migrations/20261121_schools.sql),
 * which check the signed-in user themselves.
 */
export type ApiError = "signIn" | "forbidden" | "notFound" | "invalid" | "tooMany" | "notReady" | "disabled" | "full" | "failed";
const STATUS: Record<ApiError, number> = { signIn: 401, forbidden: 403, notFound: 404, invalid: 400, tooMany: 429, notReady: 503, disabled: 503, full: 409, failed: 500 };

export const answer = (body: unknown) => Response.json(body, { headers: { "Cache-Control": "no-store" } });
export const refuse = (error: ApiError, retryAfterSeconds?: number) =>
  Response.json({ error }, { status: STATUS[error], headers: { "Cache-Control": "no-store", ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}) } });

/** A database refusal → an answer. "Founders only" / "School admins only" = 403, a missing reason = 400. */
export function refuseError(error: unknown, what: string): Response {
  const code = (error as { code?: string } | null)?.code ?? "";
  if (isMissingSql(error)) return refuse("notReady");
  if (code === "42501") return refuse("forbidden");
  if (code === "22023" || code === "22P02" || code === "22007" || code === "22008") return refuse("invalid");
  if (code === "54000") return refuse("full");
  console.error(`Rapido: ${what} failed`, error);
  return refuse("failed");
}

export type SignedIn = { db: ServerDb & { user: NonNullable<ServerDb["user"]> }; body: Record<string, unknown> };

/**
 * The start of every school / admin request: from our own pages (for changes),
 * not too often, signed in. `limits` = [per address, per user] per 10 minutes.
 */
export function guard(perIpLimit: number, perUserLimit: number) {
  const perIp = createRateLimiter({ limit: perIpLimit, windowMs: 10 * 60 * 1000 });
  const perUser = createRateLimiter({ limit: perUserLimit, windowMs: 10 * 60 * 1000 });
  return async (request: Request): Promise<SignedIn | Response> => {
    const changing = request.method !== "GET";
    if (changing && !fromOurSite(request)) return refuse("invalid");
    let limit: LimitResult = perIp.check(clientIp(request.headers));
    if (!limit.ok) return refuse("tooMany", limit.retryAfterSeconds);
    const db = await serverDb();
    if (!db) return refuse("disabled");
    if (!db.user) return refuse("signIn");
    limit = perUser.check(db.user.id);
    if (!limit.ok) return refuse("tooMany", limit.retryAfterSeconds);
    const body = changing ? await readJson(request, 400_000) : {};
    if (!body) return refuse("invalid");
    return { db: db as SignedIn["db"], body };
  };
}

// ---- Reading the request body safely ----
export const text = (value: unknown, max = 500) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuid = (value: unknown) => (typeof value === "string" && UUID.test(value) ? value : null);
export const int = (value: unknown, min: number, max: number) => {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};
/** "2027-06-30" or a full ISO time → ISO; "" / null → null (= no end date); anything else → undefined (invalid). */
export function dateOrNull(value: unknown): string | null | undefined {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  // A plain day means "until the end of that day, Tbilisi time".
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59+04:00` : value;
  const time = Date.parse(iso);
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
}
