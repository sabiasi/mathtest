/**
 * POST /api/ai/generate  { subject, grade, topic, types, count, difficulty, language, source }
 *   → { questions, usage: { used, limit }, usageId, mock, leftOut }
 * With `regenerateOf: <usageId>` it makes ONE replacement question (free, a few per generation).
 *
 * Signed-in teachers only. The monthly number of the plan is checked and
 * counted in the database; there are per-minute limits too. See lib/ai/service.ts.
 */
import { generateResponse } from "@/lib/ai/service";

export const POST = generateResponse;
