/**
 * POST /api/billing/webhook/flitt | bog | mock
 *
 * The payment provider's server tells us what happened to a payment.
 * This is the ONLY way a paid plan starts, renews or ends early:
 *   1. the message's signature is checked (is it really from the provider?);
 *   2. it is stored, and a message we've seen before changes nothing;
 *   3. the database function updates the payment and the plan.
 * The teacher's browser is not involved, so nothing here can be faked from it.
 */
import { activeProvider, siteOrigin } from "@/lib/payments/config";
import { applyEvent, isMissingSql } from "@/lib/payments/service";
import { billingSecret, serverDb } from "@/lib/server/db";
import { clientIp, createRateLimiter } from "@/lib/server/rateLimit";

/** Providers send a few messages per payment; 600 a minute per address is far above real use. */
const perIp = createRateLimiter({ limit: 600, windowMs: 60 * 1000 });
const MAX_BODY_BYTES = 200_000;

const answer = (status: number, body: Record<string, unknown>) => Response.json(body, { status });

export async function POST(request: Request, context: RouteContext<"/api/billing/webhook/[provider]">) {
  const { provider: name } = await context.params;
  const limit = perIp.check(clientIp(request.headers));
  if (!limit.ok) return answer(429, { error: "too many requests" });

  const origin = siteOrigin(request);
  const provider = activeProvider(origin);
  // Only the provider that is switched on is listened to.
  if (!provider || provider.id !== name || !provider.configured || !billingSecret()) return answer(404, { error: "not found" });

  const rawBody = await request.text().catch(() => "");
  if (!rawBody || rawBody.length > MAX_BODY_BYTES) return answer(400, { error: "bad request" });
  const input = { rawBody, headers: request.headers };
  if (!(await provider.verifyWebhook(input))) return answer(401, { error: "bad signature" });

  let event;
  try {
    event = provider.parseEvent(input);
  } catch {
    return answer(400, { error: "unreadable" });
  }
  if (!event.orderId || !event.eventId) return answer(400, { error: "unreadable" });

  try {
    const db = await serverDb();
    if (!db) return answer(503, { error: "no database" });
    const result = await applyEvent(db, origin, provider, event, rawBody);
    return answer(200, { ok: true, result: result.result });
  } catch (error) {
    // 5xx: the provider will send the message again later.
    console.error("MathTest: could not process a payment message", error);
    return answer(isMissingSql(error) ? 503 : 500, { error: "failed" });
  }
}
