import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// The voice's key (AZURE_SPEECH_KEY / AZURE_SPEECH_REGION) lives in .env.local, never in git.
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local: tutorials/voice.ts explains what's missing
}

/**
 * Records the "how to use it" videos (tutorials/*.spec.ts → public/tutorials/*.webm).
 *   npm run tutorials
 * Same app server as the browser tests (production build on :3210), one video at a
 * time so the computer isn't busy and every video moves at an even pace.
 * Needs Playwright's ffmpeg once: npx playwright install ffmpeg
 */
export default defineConfig({
  ...base,
  testDir: "./tutorials",
  testMatch: "*.spec.ts", // voice.test.ts is a unit test (vitest)
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  // A step that can't find its button fails within seconds, not after the whole timeout.
  use: { ...base.use, actionTimeout: 15_000 },
});
