import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

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
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
});
