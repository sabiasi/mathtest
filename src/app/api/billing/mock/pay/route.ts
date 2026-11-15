/**
 * POST /api/billing/mock/pay — the pretend bank (mock provider only).
 *
 *   { session, outcome }            the teacher pressed a button on /checkout/mock
 *   { action: "refund", order }     test tool: refund one of your own mock payments
 *
 * It does what a real bank does afterwards: it sends a SIGNED webhook to our
 * own webhook route over HTTP. The plan changes there, not here.
 */
import { mockProvider, siteOrigin } from "@/lib/payments/config";
import { fromOurSite, readJson } from "@/lib/payments/http";
import { MOCK_OUTCOMES, MOCK_SIGNATURE_HEADER, type MockOutcome, type MockWebhook } from "@/lib/payments/mock";
import { loadSummary } from "@/lib/payments/service";
import { serverDb } from "@/lib/server/db";
import { clientIp, createRateLimiter } from "@/lib/server/rateLimit";

const perIp = createRateLimiter({ limit: 60, windowMs: 10 * 60 * 1000 });
const answer = (status: number, body: Record<string, unknown>) => Response.json(body, { status });

export async function POST(request: Request) {
  const origin = siteOrigin(request);
  const mock = mockProvider(origin);
  if (!mock) return answer(404, { error: "not found" }); // a real provider is on, or payments are off
  if (!fromOurSite(request)) return answer(400, { error: "invalid" });
  if (!perIp.check(clientIp(request.headers)).ok) return answer(429, { error: "tooMany" });
  const body = await readJson(request);
  if (!body) return answer(400, { error: "invalid" });

  let message: MockWebhook;
  let redirect: string | null = null;
  if (body.action === "refund") {
    const summary = await loadSummary(await serverDb(), origin);
    const payment = summary.payments.find((p) => p.order_id === body.order && p.status === "paid");
    if (!payment) return answer(404, { error: "invalid" });
    message = { id: `mock_refund_${payment.id}`, type: "payment.refunded", order_id: payment.order_id, payment_id: `mock_pay_${payment.id.slice(0, 8)}`, amount: payment.amount_tetri };
  } else {
    const session = typeof body.session === "string" ? mock.readSession(body.session) : null;
    if (!session || !MOCK_OUTCOMES.includes(body.outcome as MockOutcome)) return answer(400, { error: "invalid" });
    message = mock.webhookFor(session, body.outcome as MockOutcome);
    redirect = session.returnUrl;
  }

  const raw = JSON.stringify(message);
  const delivered = await fetch(`${new URL(request.url).origin}/api/billing/webhook/mock`, {
    method: "POST",
    headers: { "Content-Type": "application/json", [MOCK_SIGNATURE_HEADER]: mock.sign(raw) },
    body: raw,
  }).catch(() => null);
  if (!delivered?.ok) return answer(502, { error: "failed" });
  return answer(200, { ok: true, redirect });
}
