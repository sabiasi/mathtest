/**
 * GET or POST /api/cron/billing — the scheduled job ("cron" = run on a timer).
 * Run it about once an hour (docs/GO_LIVE.md shows how, with Vercel Cron or
 * Supabase pg_cron). Each run:
 *   - charges renewals that are due, and retries failed ones (days 1, 3, 5);
 *   - ends cancelled plans whose time is over and grace periods that ran out
 *     (the teacher moves to Free; nothing is ever deleted);
 *   - sends reminder emails (trial ending, grace ending, plan ended), each once.
 *
 * Protected: the caller must send "Authorization: Bearer <CRON_SECRET>".
 * Running it twice, or twice at once, is safe.
 */
import { siteOrigin } from "@/lib/payments/config";
import { secretsMatch } from "@/lib/payments/http";
import { isMissingSql, runBillingJob } from "@/lib/payments/service";
import { billingSecret, serverDb } from "@/lib/server/db";
import { clientIp, createRateLimiter } from "@/lib/server/rateLimit";

/** Wrong guesses of the secret: 20 per 10 minutes per address. Real runs: 6 per minute. */
const guesses = createRateLimiter({ limit: 20, windowMs: 10 * 60 * 1000 });
const runs = createRateLimiter({ limit: 6, windowMs: 60 * 1000 });
const answer = (status: number, body: Record<string, unknown>) => Response.json(body, { status });

async function run(request: Request): Promise<Response> {
  const expected = (process.env.CRON_SECRET ?? "").trim();
  if (!expected) return answer(503, { error: "CRON_SECRET is not set" });
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secretsMatch(given, expected)) {
    if (!guesses.check(clientIp(request.headers)).ok) return answer(429, { error: "too many requests" });
    return answer(401, { error: "not allowed" });
  }
  if (!runs.check("job").ok) return answer(429, { error: "too many requests" });
  if (!billingSecret()) return answer(503, { error: "BILLING_SERVER_SECRET is not set" });
  const db = await serverDb();
  if (!db) return answer(503, { error: "no database" });
  try {
    return answer(200, { ok: true, ...(await runBillingJob(db, siteOrigin(request))) });
  } catch (error) {
    console.error("Rapido: the billing job failed", error);
    return answer(isMissingSql(error) ? 503 : 500, { error: "failed" });
  }
}

export const GET = run;
export const POST = run;
