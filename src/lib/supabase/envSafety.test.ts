/**
 * Safety net: the shared ".env" file is uploaded to GitHub, so it may only
 * contain PUBLIC values. This test fails (and `npm test` turns red) if a
 * secret ever ends up in it.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = [".env", ".env.example"].filter((name) => existsSync(name));

describe("shared env files contain no secrets", () => {
  it.each(files)("%s has only the two public Supabase values", (name) => {
    const text = readFileSync(name, "utf8");
    const settings = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    // No secret-looking values anywhere (comments included: a pasted key is a pasted key).
    expect(text).not.toMatch(/sb_secret_[A-Za-z0-9]/);
    // Only these two settings are allowed in a shared file.
    for (const line of settings) {
      expect(line).toMatch(/^NEXT_PUBLIC_SUPABASE_(URL|PUBLISHABLE_KEY)=/);
    }
    // The key must be a publishable one (or the example placeholder).
    const key = settings.find((line) => line.startsWith("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="))?.split("=")[1] ?? "";
    expect(key === "" || key.startsWith("sb_publishable_")).toBe(true);
  });
});
