import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Lets tests use the same "@/..." imports as the app.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // jsdom is a fake browser, so tests can use localStorage, window, etc.
    environment: "jsdom",
    // e2e/ holds the Playwright browser tests (npm run test:e2e), not unit tests.
    exclude: ["e2e/**", "tutorials/**/*.spec.ts", "node_modules/**", ".next/**"],
  },
});
