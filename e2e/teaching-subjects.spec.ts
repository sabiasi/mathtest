import { expect, test, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { cards, editor, openSampleCopy } from "./helpers";
import { sampleFor } from "../src/samples";
import type { SubjectId } from "../src/subjects/ids";
import type { Test } from "../src/lib/storage/types";

// UI contracts use a mocked account. Actual RLS is tested against local Postgres
// in teachingSubjectsSql.test.ts. No real account or cloud data is modified.
function configuredUrl() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  for (const name of [".env", ".env.local"]) {
    if (!existsSync(name)) continue;
    const match = readFileSync(name, "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m);
    if (match) url = match[1];
  }
  return url;
}
const supabaseUrl = configuredUrl();
test.skip(!supabaseUrl.startsWith("https://"), "Account UI requires a public Supabase URL configured at build time");

type FixtureOptions = { previewFree?: boolean; subjects?: SubjectId[]; plan?: "free" | "premium" | "school"; guestTests?: Test[]; unavailable?: boolean; failImages?: boolean };
async function account(page: Page, options: FixtureOptions = {}) {
  const uid = "10000000-0000-0000-0000-000000000001";
  let assignment = options.subjects ? { subjects: options.subjects, completed_at: "2026-11-14T10:00:00Z" } : null;
  const profile = { id: uid, full_name: "Teacher", school_name: "School", default_subject: "math", language: "ka", theme: "light", sample_added: false };
  const tests = ["math", "physics"].map((subject) => ({ ...structuredClone(sampleFor(subject as SubjectId)), id: `old-${subject}` }));
  const writes: Test[] = [];
  const selectionCalls: SubjectId[][] = [];
  // Mirrors set_plan_preview: Free while on, subjects given back when off.
  let preview: { subjects: SubjectId[] | null } | null = options.previewFree ? { subjects: options.subjects ?? null } : null;
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: uid, exp: expires, iat: expires - 3600, role: "authenticated", aud: "authenticated" })}.c2lnbmF0dXJl`;
  const session = { access_token: token, refresh_token: "mock-refresh", token_type: "bearer", expires_in: 3600, expires_at: expires,
    user: { id: uid, email: "teacher@example.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-11-14T10:00:00Z" } };
  const cookie = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  await page.addInitScript(({ cookie, value, guestTests }) => {
    document.cookie = `${cookie}=${value}; path=/; SameSite=Lax`;
    if (!sessionStorage.getItem("account-fixture")) {
      localStorage.setItem("mathtest:tests:v1", JSON.stringify(guestTests));
      sessionStorage.setItem("account-fixture", "1");
    }
  }, { cookie, value: `base64-${encode(session)}`, guestTests: options.guestTests ?? [] });

  // Serve public app routes without forwarding the fake session to server auth.
  await page.route("http://localhost:3210/**", async (route) => {
    try {
      if (route.request().isNavigationRequest() || route.request().headers().rsc) {
        const response = await route.fetch({ headers: { ...route.request().headers(), cookie: "" } });
        await route.fulfill({ response });
      } else await route.continue();
    } catch {
      // A reload cancelled this request ("response has been disposed"): nothing to answer.
    }
  });
  // The test server runs in sandbox mode, where the plan is read through our own server:
  // answer that with the same mocked plan as the Supabase mock below.
  await page.route("**/api/billing/summary", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    enabled: false, testMode: true, sandbox: false, provider: "mock", signedIn: true, canChangePeriod: true, method: null, payments: [], pending: [], profile: null,
    subscription: { plan: options.plan ?? "free", status: "active", billing_period: null, trial_ends_at: null, current_period_end: null, grace_ends_at: null, cancel_at_period_end: false, preview_free: preview !== null, provider: null, next_retry_at: null },
  }) }));
  await page.route(`${supabaseUrl}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (request.method() === "OPTIONS") return reply({});
    if (path.endsWith("/teacher_subjects")) {
      if (options.unavailable) return reply({ message: "missing migration" }, 404);
      return reply(assignment ? [assignment] : []);
    }
    if (path.endsWith("/rpc/set_teaching_subjects")) {
      const body = request.postDataJSON();
      selectionCalls.push(body.chosen);
      assignment = { subjects: body.chosen, completed_at: "2026-11-14T10:00:00Z" };
      profile.default_subject = body.preferred;
      return reply(null);
    }
    if (path.endsWith("/profiles")) return reply([profile]);
    if (path.endsWith("/rpc/set_plan_preview")) {
      const { free } = request.postDataJSON();
      if (free && !preview) preview = { subjects: assignment?.subjects ?? null };
      if (!free && preview) {
        if (preview.subjects) assignment = { subjects: preview.subjects, completed_at: "2026-11-14T10:00:00Z" };
        preview = null;
      }
      return reply(null);
    }
    if (path.endsWith("/subscriptions")) return reply([{ plan: options.plan ?? "free", status: "active", trial_ends_at: null, current_period_end: null, grace_ends_at: null, cancel_at_period_end: false, preview_free: preview !== null }]);
    if (path.endsWith("/tests")) {
      if (request.method() === "POST") { const row = request.postDataJSON(); writes.push(row.data); tests.push(row.data); return reply(null, 201); }
      return reply(tests.map((data) => ({ data })));
    }
    if (path.endsWith("/rpc/my_image_storage")) return reply({ used: 0, limit: 1024 * 1024 * 1024 });
    if (path.includes("/storage/v1/object/")) return reply({ message: "Image unavailable" }, options.failImages ? 503 : 404);
    if (path.includes("/auth/")) return reply(session.user);
    return reply([]);
  });
  return { writes, selectionCalls };
}

test("first account sign-in asks for teaching subjects and persists the selection", async ({ page }) => {
  const fixture = await account(page);
  await page.goto("/tests");
  const dialog = page.locator("[data-teaching-dialog]");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-teaching-subject]")).toHaveCount(8);
  await dialog.getByRole("button", { name: "შენახვა", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(fixture.selectionCalls).toEqual([["math"]]);
  await page.reload();
  await expect(page.locator("[data-test-card=old-math]")).toBeVisible();
  await expect(dialog).not.toBeVisible();
});

test("Free cannot create in another subject or change an existing test's subject", async ({ page }) => {
  const fixture = await account(page, { subjects: ["math"] });
  await page.goto("/editor/old-math");
  await expect(page.locator('[data-editor-ready="true"]')).toBeVisible();
  await page.locator('[data-subject="physics"]').click();
  await expect(page.locator("[data-upgrade-dialog]")).toBeVisible();
  expect(fixture.writes).toHaveLength(0);
});

test("Premium can select more subjects and create from their templates", async ({ page }) => {
  const fixture = await account(page, { plan: "premium" });
  await page.goto("/tests");
  const dialog = page.locator("[data-teaching-dialog]");
  await dialog.locator('[data-teaching-subject="physics"]').click();
  await dialog.getByRole("button", { name: "შენახვა", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(fixture.selectionCalls).toEqual([["math", "physics"]]);
  await page.goto("/editor/sample-physics");
  await page.locator("[data-sample-banner] button").click();
  await expect(page).not.toHaveURL(/sample-physics/);
  await expect.poll(() => fixture.writes.some((test) => test.subjectId === "physics")).toBe(true);
});

test("downgrade asks for one subject and leaves the other test read-only and printable", async ({ page }) => {
  const fixture = await account(page, { subjects: ["math", "physics"] });
  await page.goto("/editor/old-physics");
  const dialog = page.locator("[data-teaching-dialog]");
  await dialog.locator('[data-teaching-subject="math"]').click();
  await dialog.getByRole("button", { name: "შენახვა", exact: true }).click();
  await expect(page.locator("[data-subject-readonly]")).toBeVisible();
  expect(await page.locator('[data-editor-ready="true"] [inert]').count()).toBe(1);
  await page.goto("/print/old-physics");
  await expect(page.locator('[data-print-ready="true"]')).toBeVisible();
  expect(fixture.writes).toHaveLength(0);
});

test("previewing Free applies Free rules on My tests, and switching back restores the subjects", async ({ page }) => {
  const fixture = await account(page, { plan: "premium", subjects: ["math", "physics"], previewFree: true });
  await page.goto("/tests");
  // The real Free experience: two subjects → choose one.
  const dialog = page.locator("[data-teaching-dialog]");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("ერთი");
  await dialog.locator('[data-teaching-subject="math"]').click();
  await dialog.getByRole("button", { name: "შენახვა", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const bar = page.locator("[data-plan-preview-bar]");
  await bar.getByRole("button").click();
  await expect(bar).not.toBeVisible();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.locator("[data-test-card=old-physics]")).toBeVisible();
  await expect(bar).not.toBeVisible();
  await expect(dialog).not.toBeVisible();
  expect(fixture.selectionCalls).toEqual([["math"]]);
});

test("out-of-subject guest work stays on the device with a readable preview", async ({ page }) => {
  const guest = { ...structuredClone(sampleFor("physics")), id: "guest-physics" };
  const fixture = await account(page, { subjects: ["math"], guestTests: [guest] });
  await page.goto("/tests");
  await page.locator("[data-retained-tests] a").click();
  await expect(page.locator("[data-subject-readonly]")).toBeVisible();
  expect(fixture.writes).toHaveLength(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("mathtest:tests:v1") ?? "[]").length)).toBe(1);
  await page.goto("/print/device~guest-physics");
  await expect(page.locator('[data-print-ready="true"]')).toBeVisible();
});

test("a missing database migration fails closed but still allows reading an existing test", async ({ page }) => {
  const fixture = await account(page, { unavailable: true });
  await page.goto("/editor/old-math");
  await expect(page.locator("[data-subject-readonly]")).toBeVisible();
  await expect(page.locator('[data-editor-ready="true"]')).toBeVisible();
  expect(fixture.writes).toHaveLength(0);
});

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64");
async function guestWithPicture(page: Page) {
  await openSampleCopy(page, "physics");
  await cards(page).first().locator('input[type="file"]').first().setInputFiles({ name: "picture.png", mimeType: "image/png", buffer: PNG });
  await expect(cards(page).first().locator("img").first()).toBeVisible();
  await expect(editor(page).locator('[data-save-state="saved"]')).toBeVisible();
  return await page.evaluate(() => JSON.parse(localStorage.getItem("mathtest:tests:v1") ?? "[]") as Test[]);
}

test("a retained guest picture still renders while signed into an account", async ({ page }) => {
  const guestTests = await guestWithPicture(page);
  await account(page, { subjects: ["math"], guestTests });
  await page.goto(`/print/device~${guestTests[0].id}`);
  await expect(page.locator('[data-print-ready="true"]')).toBeVisible();
  const picture = page.locator('.sheet img[src^="blob:"]').first();
  await expect(picture).toBeVisible();
  expect(await picture.evaluate((el: HTMLImageElement) => el.naturalWidth > 0)).toBe(true);
});

test("failed image migration leaves the original guest test and picture intact", async ({ page }) => {
  const guestTests = await guestWithPicture(page);
  const fixture = await account(page, { subjects: ["physics"], guestTests, failImages: true });
  await page.goto("/tests");
  await expect(page.locator("[data-retained-tests]")).toBeVisible();
  await expect(page.getByText("ბრაუზერში შენახული ტესტების გადატანა ვერ დასრულდა.", { exact: false })).toBeVisible();
  expect(fixture.writes).toHaveLength(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("mathtest:tests:v1") ?? "[]").length)).toBe(1);
});
