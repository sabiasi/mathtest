/**
 * POST /api/school-request  { contact_name, school_name, city, teachers, email, phone, message, language }
 *
 * Saves a School plan request from /pricing into the `school_requests`
 * table. Anyone may send one (no account needed), so there are limits:
 * a few per visitor per hour, and a cap for everyone together.
 * The database only lets visitors ADD requests, never read them.
 */
import { clientIp, createRateLimiter } from "@/lib/server/rateLimit";
import { parseSchoolRequest } from "@/lib/schoolRequest";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server";
import { serverDb } from "@/lib/server/db";
import { sandboxEnabled, sandboxSchoolRequest } from "@/lib/server/sandbox";

const HOUR = 60 * 60 * 1000;
/** Each visitor (by IP address): 5 requests per hour. */
const perVisitor = createRateLimiter({ limit: 5, windowMs: HOUR });
/** Everyone together: 100 per hour (protection against floods). */
const everyone = createRateLimiter({ limit: 100, windowMs: HOUR });
const MAX_BODY_BYTES = 20_000;

const reply = (status: number, body: Record<string, unknown>, retryAfterSeconds?: number) =>
  Response.json(body, { status, headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined });

export async function POST(request: Request) {
  if (!supabaseConfigured && !sandboxEnabled()) return reply(501, { error: "not configured" });

  let limit = perVisitor.check(`ip:${clientIp(request.headers)}`);
  if (limit.ok) limit = everyone.check("all");
  if (!limit.ok) return reply(429, { error: "too many requests" }, limit.retryAfterSeconds);

  const text = await request.text().catch(() => "");
  if (text.length > MAX_BODY_BYTES) return reply(413, { error: "too big" });
  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = null;
  }
  // A hidden field people never see: when a robot fills it in, pretend all went well.
  if (typeof body?.website === "string" && body.website !== "") return reply(200, { ok: true });

  const schoolRequest = parseSchoolRequest(body);
  if (!schoolRequest) return reply(400, { error: "invalid" });

  // The local sandbox (npm run dev:sandbox): into the pretend database, so /admin shows it.
  if (sandboxEnabled()) {
    try {
      const db = await serverDb();
      await sandboxSchoolRequest(schoolRequest, db?.user?.id ?? null);
      return reply(200, { ok: true });
    } catch (error) {
      console.error("MathTest: could not save a school request (sandbox)", error);
      return reply(500, { error: "failed" });
    }
  }

  // Uses the visitor's own sign-in (or none): the database decides what's allowed.
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("school_requests").insert(schoolRequest);
  if (error) {
    console.error("MathTest: could not save a school request", error);
    return reply(500, { error: "failed" });
  }
  return reply(200, { ok: true });
}
