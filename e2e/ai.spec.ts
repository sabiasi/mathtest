import { expect, test, type Page } from "@playwright/test";
import { accountsConfigured, signIn } from "./account";
import { cards, editor, openSampleCopy } from "./helpers";

/**
 * "AI-ით შექმნა" in MOCK MODE (no ANTHROPIC_API_KEY on the test server): the
 * same route, limits (in the sandbox database, real SQL) and checks as with
 * the real AI, with ready-made sample questions. Nothing is sent anywhere.
 */

/** A signed-in teacher with an editable test (a copy of the subject's sample). */
async function teacherWithTest(page: Page, subject = "math") {
  const teacher = await signIn(page, { subjects: [subject] });
  await page.goto(`/editor/sample-${subject}`);
  // "Use as template" works once the account's subjects have loaded: click until the copy opens.
  await expect(async () => {
    if (new URL(page.url()).pathname.includes("sample-")) await page.locator("[data-sample-banner] button").click({ timeout: 2000 });
    await page.waitForURL((url) => url.pathname.startsWith("/editor/") && !url.pathname.includes("sample-"), { timeout: 3000 });
  }).toPass({ timeout: 30_000 });
  await expect(editor(page)).toBeVisible();
  return teacher;
}
const dialog = (page: Page) => page.locator("[data-ai-dialog]");
async function generate(page: Page, topic: string) {
  await editor(page).locator("[data-ai-open]").click();
  await expect(dialog(page)).toHaveAttribute("data-ai-dialog", "form");
  await dialog(page).locator("[data-ai-topic]").fill(topic);
  await dialog(page).locator("[data-ai-generate]").click();
}

test.describe("signed-in teacher", () => {
  test.skip(!accountsConfigured, "Account UI requires a public Supabase URL configured at build time");

  test("generate → review (remove one, replace one) → only the kept questions are added", async ({ page }) => {
    await teacherWithTest(page);
    const before = await cards(page).count();
    await generate(page, "კვადრატული განტოლებები");

    await expect(dialog(page)).toHaveAttribute("data-ai-dialog", "review");
    await expect(dialog(page).locator("[data-ai-mock]")).toBeVisible(); // says clearly that these are samples
    const suggestions = dialog(page).locator("[data-ai-question]");
    await expect(suggestions).toHaveCount(5);
    // Formulas arrive as real formulas, and the right answer is marked.
    await expect(suggestions.first().locator(".ML__latex").first()).toBeVisible();
    await expect(suggestions.first().locator('[data-correct="true"]')).toHaveCount(1);
    // Nothing is in the test yet.
    expect(await cards(page).count()).toBe(before);

    await suggestions.nth(1).locator("[data-ai-remove]").click();
    await expect(suggestions).toHaveCount(4);
    const firstText = await suggestions.first().innerText();
    await suggestions.first().locator("[data-ai-regenerate]").click();
    await expect.poll(async () => suggestions.first().innerText()).not.toBe(firstText);
    await expect(suggestions).toHaveCount(4);

    await dialog(page).locator("[data-ai-insert]").click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(cards(page)).toHaveCount(before + 4);
    // They are ordinary questions now: the inserted formula can be opened like any other.
    await expect(cards(page).nth(before).locator("math-field, [data-chem]").first()).toBeAttached();
  });

  test("shows how many generations are left, and counts one per generation (not per replacement)", async ({ page }) => {
    await teacherWithTest(page);
    await editor(page).locator("[data-ai-open]").click();
    const left = dialog(page).locator("[data-ai-left]");
    await expect(left).toHaveAttribute("data-ai-left", "100"); // the trial = Premium
    await dialog(page).locator("[data-ai-topic]").fill("წილადები");
    await dialog(page).locator("[data-ai-generate]").click();
    await expect(dialog(page)).toHaveAttribute("data-ai-dialog", "review");
    await dialog(page).locator("[data-ai-regenerate]").first().click();
    await expect(dialog(page).locator("[data-ai-regenerate]").first()).toBeEnabled();
    const usage = await (await page.request.get("/api/ai/usage")).json();
    expect(usage).toMatchObject({ used: 1, limit: 100, plan: "premium", mock: true });
  });

  test("Free: after the plan's 3 generations the upgrade window opens, and nothing more is generated", async ({ page }) => {
    await teacherWithTest(page);
    await page.request.get("/api/billing/summary"); // makes the sandbox account
    expect((await page.request.post("/api/sandbox", { data: { action: "skipDays", days: 15 } })).ok()).toBe(true); // the trial is over
    for (let i = 0; i < 3; i++) {
      await generate(page, "პროცენტები");
      await expect(dialog(page)).toHaveAttribute("data-ai-dialog", "review");
      // (Closing by accident keeps the suggestions; "Back" is how a teacher starts over.)
      await dialog(page).locator("[data-ai-back]").click();
      await page.keyboard.press("Escape");
      await expect(dialog(page)).toHaveCount(0);
    }
    await generate(page, "პროცენტები");
    await expect(page.locator("[data-upgrade-dialog]")).toBeVisible();
    await expect(page.locator("[data-upgrade-dialog]")).toContainText("3");
    // (Retried: under load the local server sometimes drops a connection.)
    await expect(async () => {
      expect(await (await page.request.get("/api/ai/usage")).json()).toMatchObject({ used: 3, limit: 3, plan: "free" });
    }).toPass({ timeout: 10_000 });
  });

  test("chemistry: formulas and balanced equations arrive in our own format", async ({ page }) => {
    await teacherWithTest(page, "chemistry");
    await editor(page).locator("[data-ai-open]").click();
    for (const type of ["multiple-choice", "true-false", "short-answer"]) await dialog(page).locator(`[data-ai-type="${type}"][aria-pressed="true"]`).click();
    await dialog(page).locator('[data-ai-type="balance"]').click();
    await dialog(page).locator('[data-ai-type="multiple-choice"]').click();
    await dialog(page).locator("[data-ai-topic]").fill("რეაქციები");
    await dialog(page).locator("[data-ai-count]").fill("2");
    await dialog(page).locator("[data-ai-generate]").click();
    await expect(dialog(page).locator('[data-ai-question="multiple-choice"]')).toHaveCount(1);
    await expect(dialog(page).locator('[data-ai-question="balance"]')).toHaveCount(1);
    const before = await cards(page).count();
    await dialog(page).locator("[data-ai-insert]").click();
    await expect(cards(page)).toHaveCount(before + 2);
    await expect(cards(page).last().locator("input").first()).toBeAttached();
  });

  test("the server checks the request itself", async ({ page }) => {
    await teacherWithTest(page);
    const post = (body: unknown) => page.evaluate(async (data) => {
      const response = await fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return { status: response.status, body: await response.json() };
    }, body);
    const good = { subject: "math", grade: "9", topic: "წილადები", types: ["true-false"], count: 2, difficulty: "easy", language: "ka", source: "" };
    expect((await post({ ...good, count: 50 })).status).toBe(400);
    expect((await post({ ...good, topic: "" })).body).toEqual({ error: "topic" });
    expect((await post({ ...good, types: ["balance"] })).body).toEqual({ error: "types" }); // maths has no such type
    expect((await post({ ...good, source: "x".repeat(9000) })).status).toBe(413);
    expect((await post({ ...good, regenerateOf: 999999 })).body).toEqual({ error: "regenerations" }); // not their generation
    const fine = await post(good);
    expect(fine.status).toBe(200);
    expect(fine.body.questions).toHaveLength(2);
    expect(fine.body.questions[0]).toMatchObject({ type: "true-false", images: [], grid: null });
    // None of the refused requests was counted.
    expect(await (await page.request.get("/api/ai/usage")).json()).toMatchObject({ used: 1 });
  });
});

test("guests are offered a free account instead; the server refuses them", async ({ page, request }) => {
  await openSampleCopy(page, "math");
  await editor(page).locator("[data-ai-open]").click();
  await expect(page.locator("[data-trial-dialog]")).toBeVisible();
  await expect(page.locator("[data-ai-dialog]")).toHaveCount(0);
  const response = await request.post("/api/ai/generate", { data: { subject: "math", topic: "x y", types: ["true-false"], count: 1 } });
  expect(response.status()).toBe(401);
  expect((await request.get("/api/ai/usage")).status()).toBe(401);
});
