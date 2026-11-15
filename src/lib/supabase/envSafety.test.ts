/**
 * Safety net: the shared ".env" file is uploaded to GitHub, so it may only
 * contain PUBLIC values. This test fails (and `npm test` turns red) if a
 * secret ever ends up in it.
 *
 * ".env.example" is uploaded too. It LISTS the server-only settings (so
 * nobody has to guess their names), but every one of them must be EMPTY.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const settingsOf = (name: string) =>
  readFileSync(name, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

const PUBLIC = /^NEXT_PUBLIC_SUPABASE_(URL|PUBLISHABLE_KEY)=/;
/** No secret-looking values anywhere (comments included: a pasted key is a pasted key). */
const SECRET_SHAPES = [/sb_secret_[A-Za-z0-9]/, /\bre_[A-Za-z0-9_]{16,}/, /sk-ant-[A-Za-z0-9-]{8,}/, /service_role\s*=/, /BEGIN (RSA )?PRIVATE KEY/];

function checkPublicKey(settings: string[]) {
  // The key must be a publishable one (or the example placeholder).
  const key = settings.find((line) => line.startsWith("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="))?.split("=")[1] ?? "";
  expect(key === "" || key.startsWith("sb_publishable_")).toBe(true);
}

describe("shared env files contain no secrets", () => {
  it.runIf(existsSync(".env"))(".env has only the two public Supabase values", () => {
    const text = readFileSync(".env", "utf8");
    for (const shape of SECRET_SHAPES) expect(text).not.toMatch(shape);
    const settings = settingsOf(".env");
    for (const line of settings) expect(line).toMatch(PUBLIC);
    checkPublicKey(settings);
  });

  it(".env.example lists the server-only settings with EMPTY values", () => {
    const text = readFileSync(".env.example", "utf8");
    for (const shape of SECRET_SHAPES) expect(text).not.toMatch(shape);
    const settings = settingsOf(".env.example");
    for (const line of settings) {
      if (PUBLIC.test(line)) continue;
      // NAME= and nothing after it.
      expect(line, `"${line.split("=")[0]}" must be empty in .env.example`).toMatch(/^[A-Z][A-Z0-9_]*=$/);
    }
    checkPublicKey(settings);
  });

  it(".env.example names every server setting the code reads", () => {
    const names = new Set(settingsOf(".env.example").map((line) => line.split("=")[0]));
    for (const name of ["SITE_URL", "PAYMENT_PROVIDER", "BILLING_SERVER_SECRET", "CRON_SECRET", "FLITT_MERCHANT_ID", "FLITT_SECRET_KEY", "BOG_CLIENT_ID", "BOG_CLIENT_SECRET", "BOG_CALLBACK_PUBLIC_KEY", "RESEND_API_KEY", "EMAIL_FROM", "MATHTEST_SANDBOX", "ANTHROPIC_API_KEY"]) {
      expect(names.has(name), name).toBe(true);
    }
  });
});
