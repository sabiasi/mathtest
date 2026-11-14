import "server-only";
import { createRateLimiter, type LimitResult } from "./rateLimit";

const DAY = 24 * 60 * 60 * 1000;
/** Trial starts per IP address per day (env GUEST_TRIALS_PER_IP_PER_DAY; browser tests raise it). */
const PER_IP = Number(process.env.GUEST_TRIALS_PER_IP_PER_DAY) || 30;
const perIp = createRateLimiter({ limit: PER_IP, windowMs: DAY });
/** All guests together per hour: protection against floods. */
const everyone = createRateLimiter({ limit: Math.max(500, PER_IP), windowMs: 60 * 60 * 1000 });

export const guestTrialLimits = {
  check(ip: string): LimitResult {
    const mine = perIp.check(`ip:${ip}`);
    return mine.ok ? everyone.check("all") : mine;
  },
};
