/**
 * POST /api/billing/checkout  { period: "month" | "year" | "schoolYear", language }
 *   → { url }  the payment page to send the teacher to.
 *
 * Signed-in teachers only. The browser says only WHICH period; the plan and
 * the price are taken from lib/plans/plans.ts here on the server.
 */
import { readJson, refuse, refuseError, teacherAction } from "@/lib/payments/http";
import { isBillingPeriod, startCheckout } from "@/lib/payments/service";

export async function POST(request: Request) {
  const context = await teacherAction(request);
  if (context instanceof Response) return context;
  const body = await readJson(request);
  if (!body || !isBillingPeriod(body.period)) return refuse("invalid");
  try {
    const result = await startCheckout(context.db, context.origin, body.period, body.language === "en" ? "en" : "ka");
    return "error" in result ? refuse(result.error) : Response.json({ url: result.url });
  } catch (error) {
    return refuseError(error, "checkout");
  }
}
