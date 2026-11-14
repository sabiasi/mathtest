import { defineConfig } from "@playwright/test";

/**
 * Browser tests (Playwright): real clicks and typing in a real Chrome.
 *   npm run test:e2e        build the app, start it on port 3210, run e2e/*.spec.ts
 * They run as a GUEST (a fresh browser has no tests), so no account is needed.
 * Uses the Chrome installed on this computer (no extra browser download).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3210",
    channel: "chrome",
    viewport: { width: 1280, height: 800 },
    locale: "ka-GE",
    trace: "retain-on-failure",
  },
  webServer: {
    // The production build: fast and the same as what teachers get.
    command: "npm run build && npx next start -p 3210",
    url: "http://localhost:3210",
    reuseExistingServer: true,
    timeout: 300_000,
    // Every test starts a guest trial from the same address: lift the per-IP daily limit.
    env: { GUEST_TRIALS_PER_IP_PER_DAY: "100000" },
  },
});
