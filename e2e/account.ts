import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

/**
 * A made-up signed-in teacher for the browser tests of account features.
 *
 * - The browser gets a sign-in cookie that looks real; everything the page
 *   asks Supabase is answered here (no real account, no cloud data).
 * - Our own server runs in SANDBOX mode (playwright.config.ts): its billing
 *   routes use a pretend in-memory database with the real SQL, and accept
 *   this cookie. Each test gets its own random account, so tests can run
 *   side by side.
 */
function configuredUrl() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  for (const name of [".env", ".env.local"]) {
    if (!existsSync(name)) continue;
    const match = readFileSync(name, "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m);
    if (match) url = match[1];
  }
  return url;
}
export const supabaseUrl = configuredUrl();
export const accountsConfigured = supabaseUrl.startsWith("https://");

export type Teacher = { uid: string; email: string };

export async function signIn(page: Page, options: { subjects?: string[]; language?: "ka" | "en" } = {}): Promise<Teacher> {
  const uid = randomUUID();
  const email = `teacher-${uid.slice(0, 8)}@example.test`;
  const profile: Record<string, unknown> = { id: uid, full_name: "ნინო მასწავლებელი", school_name: "სატესტო სკოლა", default_subject: "math", language: options.language ?? "ka", theme: "light", sample_added: false };
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: uid, email, exp: expires, iat: expires - 3600, role: "authenticated", aud: "authenticated" })}.c2lnbmF0dXJl`;
  const user = { id: uid, email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-11-14T10:00:00Z" };
  const session = { access_token: token, refresh_token: "mock-refresh", token_type: "bearer", expires_in: 3600, expires_at: expires, user };
  const cookie = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  await page.context().addCookies([{ name: cookie, value: `base64-${encode(session)}`, url: "http://localhost:3210", sameSite: "Lax" }]);

  const uploads = new Map<string, Buffer>();
  const bank: Record<string, unknown>[] = [];
  await page.route(`${supabaseUrl}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (request.method() === "OPTIONS") return reply({});
    if (path.endsWith("/teacher_subjects")) return reply([{ subjects: options.subjects ?? ["math"], completed_at: "2026-11-14T10:00:00Z" }]);
    if (path.endsWith("/profiles")) {
      // Saved profile changes are remembered for the rest of the test (also across reloads).
      if (request.method() === "PATCH") Object.assign(profile, request.postDataJSON());
      return reply(request.headers().accept?.includes("vnd.pgrst.object") ? profile : [profile]);
    }
    if (path.endsWith("/bank_questions")) {
      // The question bank: a small pretend table (the real rules are tested in src/lib/premiumSql.test.ts).
      const wanted = new URL(request.url()).searchParams.get("id")?.replace(/^eq\./, "");
      if (request.method() === "GET") return reply([...bank].reverse());
      if (request.method() === "POST") {
        const row = { ...request.postDataJSON(), id: randomUUID(), created_at: new Date().toISOString() };
        bank.push(row);
        return reply(row, 201);
      }
      const index = bank.findIndex((row) => row.id === wanted);
      if (request.method() === "PATCH" && index >= 0) Object.assign(bank[index], request.postDataJSON());
      if (request.method() === "DELETE" && index >= 0) bank.splice(index, 1);
      return reply([]);
    }
    if (path.endsWith("/rpc/my_image_storage")) return reply({ used: 0, limit: 50 * 1024 * 1024 });
    if (path.endsWith("/rpc/image_upload_allowed")) return reply(true);
    if (path.includes("/storage/v1/object/")) {
      // Uploads are accepted and kept in memory, so the same picture can be read back.
      const name = path.split("/").pop() ?? "";
      if (request.method() === "POST" || request.method() === "PUT") {
        uploads.set(name, request.postDataBuffer() ?? Buffer.alloc(0));
        return reply({ Key: name });
      }
      const stored = uploads.get(name);
      return stored ? route.fulfill({ status: 200, contentType: "image/png", body: stored }) : reply({ message: "not found" }, 404);
    }
    if (path.includes("/auth/v1/token")) return reply(session);
    if (path.includes("/auth/")) return reply(user);
    return reply([]);
  });
  return { uid, email };
}

/** A signed-in teacher with an editable test (a copy of the subject's sample) open in the editor. */
export async function teacherWithTest(page: Page, subject = "math", options: Parameters<typeof signIn>[1] = {}): Promise<Teacher> {
  const teacher = await signIn(page, { subjects: [subject], ...options });
  await page.goto(`/editor/sample-${subject}`);
  // "Use as template" works once the account's subjects have loaded: click until the copy opens.
  await expect(async () => {
    if (new URL(page.url()).pathname.includes("sample-")) await page.locator("[data-sample-banner] button").click({ timeout: 2000 });
    await page.waitForURL((url) => url.pathname.startsWith("/editor/") && !url.pathname.includes("sample-"), { timeout: 3000 });
  }).toPass({ timeout: 30_000 });
  await expect(page.locator('[data-editor-ready="true"]:visible')).toBeVisible();
  return teacher;
}

/** A new sandbox account starts with the Premium trial; this ends it (→ Free). */
export async function becomeFree(page: Page) {
  await page.request.get("/api/billing/summary"); // makes the sandbox account
  expect((await page.request.post("/api/sandbox", { data: { action: "skipDays", days: 15 } })).ok()).toBe(true);
}

/** Settings → My plan, once the plan is known. */
export async function openMyPlan(page: Page) {
  await page.goto("/settings");
  await expect(page.locator("[data-plan-summary]")).toBeVisible();
  await expect(page.locator("[data-billing]")).toBeVisible();
}

/** /pricing → "Buy" for a period → the pretend bank page → one of its buttons. */
export async function buy(page: Page, period: "month" | "year" | "schoolYear", outcome: "success" | "successThenDecline" | "declined" | "threeDsFailed") {
  await page.goto("/pricing");
  await page.locator("main").getByRole("group").first().getByRole("button").nth(["month", "year", "schoolYear"].indexOf(period)).click();
  const button = page.locator(`[data-buy-premium="${period}"]`);
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.locator("[data-mock-checkout]")).toBeVisible();
  await page.locator(`[data-mock-outcome="${outcome}"]`).click();
}

/** The test tools under My plan (sandbox only). */
export async function skipDays(page: Page, days: 1 | 2 | 7 | 31) {
  await page.locator(`[data-sandbox-skip="${days}"]`).click();
  await expect(page.locator(`[data-sandbox-skip="${days}"]`)).toBeEnabled();
}
export async function runJob(page: Page) {
  await page.locator("[data-sandbox-job]").click();
  await expect(page.locator("[data-sandbox-job]")).toBeEnabled();
}
export const emailKinds = (page: Page) => page.locator("[data-sandbox-emails] [data-email-kind]").evaluateAll((items) => items.map((item) => item.getAttribute("data-email-kind")));

/**
 * Pretend time passed until `extraDays` AFTER the paid period ends — whatever
 * today's date is (months have 28–31 days, so a fixed "+31 days" would not do).
 */
export async function skipPastPeriodEnd(page: Page, extraDays: number) {
  const summary = (await (await page.request.get("/api/billing/summary")).json()) as { subscription: { current_period_end: string } };
  const days = (Date.parse(summary.subscription.current_period_end) - Date.now()) / 86_400_000 + extraDays;
  const response = await page.request.post("/api/sandbox", { data: { action: "skipDays", days } });
  expect(response.ok()).toBe(true);
}
