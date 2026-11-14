/**
 * POST /api/guest-trial — a guest is about to start their one free trial test.
 *
 * A light server-side check (no fingerprinting): at most N trial starts per
 * IP address per day, and a cap for all guests together. Generous on purpose,
 * because a whole school often shares one IP address. The browser also
 * remembers the trial itself (lib/guestTrial.ts); this only stops scripts
 * from creating endless guest sessions. Features that cost the server work
 * (PDF, later the AI generator) have their own limits and, for AI, need an
 * account.
 *
 * Counts live in this server's memory (lib/server/rateLimit.ts), with the IP
 * only as a key, never stored anywhere else.
 */
import { guestTrialLimits } from "@/lib/server/guestTrial";
import { clientIp } from "@/lib/server/rateLimit";

export async function POST(request: Request) {
  const result = guestTrialLimits.check(clientIp(request.headers));
  if (!result.ok) {
    return Response.json({ ok: false }, { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } });
  }
  return Response.json({ ok: true });
}
