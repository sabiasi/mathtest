import { describe, expect, it } from "vitest";
import { clientIp, createConcurrencyLimit, createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows `limit` requests per window, then says how long to wait", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(limiter.check("a", 0).ok).toBe(true);
    expect(limiter.check("a", 1_000).ok).toBe(true);
    expect(limiter.check("a", 2_000)).toEqual({ ok: false, retryAfterSeconds: 58 });
    // Other visitors are counted separately.
    expect(limiter.check("b", 2_000).ok).toBe(true);
    // Once the first request is a minute old, there's room again.
    expect(limiter.check("a", 60_001).ok).toBe(true);
  });

  it("forgets the oldest visitors when it remembers too many", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    limiter.check("a", 0);
    limiter.check("b", 0);
    limiter.check("c", 0); // "a" is forgotten
    expect(limiter.check("a", 1).ok).toBe(true);
    expect(limiter.check("c", 1).ok).toBe(false);
  });
});

describe("createConcurrencyLimit", () => {
  it("lets at most `max` jobs run at once", () => {
    const limit = createConcurrencyLimit(2);
    const first = limit.tryStart()!;
    const second = limit.tryStart()!;
    expect(limit.tryStart()).toBeNull();
    first();
    first(); // calling "done" twice doesn't free two places
    expect(limit.running).toBe(1);
    expect(limit.tryStart()).not.toBeNull();
    second();
  });
});

describe("clientIp", () => {
  it("takes the visitor's address from the hosting headers", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(clientIp(new Headers())).toBe("local");
  });
});
