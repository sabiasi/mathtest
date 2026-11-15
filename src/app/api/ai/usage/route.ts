/** GET /api/ai/usage → { used, limit, plan, mock }: "N of M generations left this month" for the signed-in teacher. */
import { usageResponse } from "@/lib/ai/service";

export const GET = usageResponse;
