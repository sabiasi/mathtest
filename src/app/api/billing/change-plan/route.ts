/**
 * POST /api/billing/change-plan
 *   { period }          monthly ↔ yearly ↔ school year: applies from the next renewal, nothing is charged now.
 *   { plan: "school" }  Premium → School is a request to the founders (invoice), so we point to the form.
 */
import { ok, readJson, refuse, refuseError, teacherAction } from "@/lib/payments/http";
import { isBillingPeriod, setPeriod } from "@/lib/payments/service";

export async function POST(request: Request) {
  const context = await teacherAction(request);
  if (context instanceof Response) return context;
  const body = await readJson(request);
  if (body?.plan === "school") return ok({ redirect: "/pricing#school" });
  if (!body || !isBillingPeriod(body.period)) return refuse("invalid");
  try {
    const result = await setPeriod(context.db, context.origin, body.period);
    return "error" in result ? refuse(result.error) : ok();
  } catch (error) {
    return refuseError(error, "change-plan");
  }
}
