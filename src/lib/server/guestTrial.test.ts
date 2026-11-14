// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("guest trial limit per IP", () => {
  it("allows a generous number per address per day, then refuses with a wait time", async () => {
    vi.stubEnv("GUEST_TRIALS_PER_IP_PER_DAY", "3");
    vi.resetModules();
    const { guestTrialLimits } = await import("./guestTrial");
    for (let i = 0; i < 3; i++) expect(guestTrialLimits.check("1.2.3.4").ok).toBe(true);
    const refused = guestTrialLimits.check("1.2.3.4");
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.retryAfterSeconds).toBeGreaterThan(0);
    // Another address is not affected.
    expect(guestTrialLimits.check("5.6.7.8").ok).toBe(true);
    vi.unstubAllEnvs();
  });
});
