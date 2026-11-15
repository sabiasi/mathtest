/**
 * POST /api/billing/cancel — stop renewing: the plan keeps working until the paid time ends.
 * Nothing is charged or refunded here, and nothing is deleted.
 */
import { ok, refuse, refuseError, teacherAction } from "@/lib/payments/http";
import { setCancel } from "@/lib/payments/service";

export async function POST(request: Request) {
  const context = await teacherAction(request);
  if (context instanceof Response) return context;
  try {
    const result = await setCancel(context.db, context.origin, true);
    return "error" in result ? refuse(result.error) : ok();
  } catch (error) {
    return refuseError(error, "cancel");
  }
}
