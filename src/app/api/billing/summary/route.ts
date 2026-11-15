/**
 * GET /api/billing/summary → are payments on, and (signed in) the plan, the
 * card's last 4 digits and the receipts. Read-only.
 */
import { siteOrigin } from "@/lib/payments/config";
import { loadSummary } from "@/lib/payments/service";
import { clientIp, createRateLimiter } from "@/lib/server/rateLimit";
import { serverDb } from "@/lib/server/db";

/** Each address: 120 reads per minute (the success page asks every second or two for a short while). */
const perIp = createRateLimiter({ limit: 120, windowMs: 60 * 1000 });

export async function GET(request: Request) {
  const limit = perIp.check(clientIp(request.headers));
  if (!limit.ok) return Response.json({ error: "tooMany" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  const summary = await loadSummary(await serverDb(), siteOrigin(request));
  return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
}
