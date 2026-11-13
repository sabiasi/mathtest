/**
 * Simple protection against abuse: "at most N requests per X minutes" for
 * each visitor ("rate limiting"), and "at most N PDFs being made at once".
 *
 * The counts live in this server's memory. That's enough for one server
 * (npm start, or one container). With several servers or serverless hosting
 * each instance counts on its own; then use a shared store such as Redis
 * (e.g. Upstash) — see CLAUDE.md.
 */

export type LimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Remembers when each visitor ("key", e.g. their IP address) made requests
 * and refuses once they made `limit` within the last `windowMs`.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 10_000 }: { limit: number; windowMs: number; maxKeys?: number }) {
  const hits = new Map<string, number[]>();

  return {
    check(key: string, now = Date.now()): LimitResult {
      const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
      }
      recent.push(now);
      hits.delete(key); // re-insert, so the Map's order is "least recently used first"
      hits.set(key, recent);
      // Don't let the memory grow forever: forget the visitors seen longest ago.
      while (hits.size > maxKeys) hits.delete(hits.keys().next().value!);
      return { ok: true };
    },
  };
}

/** Allows at most `max` jobs at the same time. `tryStart` returns a "done" function, or null when full. */
export function createConcurrencyLimit(max: number) {
  let running = 0;
  return {
    tryStart(): (() => void) | null {
      if (running >= max) return null;
      running++;
      let finished = false;
      return () => {
        if (finished) return;
        finished = true;
        running--;
      };
    },
    get running() {
      return running;
    },
  };
}

/**
 * The visitor's IP address. Hosting services put it in "x-forwarded-for"
 * (the first address is the visitor). Locally there is none: "local".
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "local";
}
