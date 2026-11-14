import { expect, test, type Page } from "@playwright/test";
import { editor, openSampleCopy } from "./helpers";

// Guests: ONE free trial test, then "sign up free". (Fresh browser = a new visitor.)
const dialog = (page: Page) => page.locator("[data-trial-dialog]");

async function home(page: Page) {
  await page.goto("/tests");
  await expect(page.locator("[data-test-card]").first()).toBeVisible();
}

test("the first test is free; a second one, a copy or a template asks to sign up", async ({ page }) => {
  // Samples are free to look at and don't use the trial.
  await page.goto("/editor/sample-math");
  await expect(page.locator("[data-sample-banner]")).toBeVisible();
  await page.goto("/print/sample-physics");
  await expect(page.locator('[data-print-ready="true"]')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("mathtest:guest-trial"))).toBeNull();
  expect((await page.context().cookies()).some((c) => c.name === "mathtest_trial")).toBe(false);

  // The trial: a full, editable test with the small note.
  await openSampleCopy(page, "math");
  await expect(editor(page).locator("[data-trial-note]")).toBeVisible();
  await expect(page.locator("[data-trial-dialog]")).toHaveCount(0);

  // A second test: the friendly window, with sign up, Google and sign in.
  await home(page);
  await page.getByRole("button", { name: "ახალი ტესტის შექმნა" }).first().click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toContainText("უფასო ცდა");
  await expect(dialog(page).locator("[data-trial-signup]")).toHaveAttribute("href", /\/signup/);
  await expect(dialog(page).locator("[data-trial-signin]")).toHaveAttribute("href", /\/signin/);
  await expect(dialog(page).getByRole("button", { name: /Google/ })).toBeVisible();
  await page.keyboard.press("Escape");

  // A copy of the trial test.
  await page.locator("[data-test-card]").first().getByRole("button", { name: "სხვა მოქმედებები" }).click();
  await page.getByRole("menuitem", { name: "ასლი" }).click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press("Escape");

  // "Use as template" from a sample.
  await page.goto("/editor/sample-physics");
  await page.locator("[data-sample-banner] button").click();
  await expect(dialog(page)).toBeVisible();
  expect(page.url()).toContain("sample-physics");

  // Still only the one trial test, and it still opens.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("mathtest:tests:v1") ?? "[]").length);
  expect(saved).toBe(1);
});

test("the trial is remembered after closing the site, even when one storage place is cleared", async ({ page, context }) => {
  await openSampleCopy(page, "chemistry");
  // Clear localStorage (the tests and the flag): the cookie and IndexedDB still remember.
  await page.evaluate(() => localStorage.clear());
  await home(page).catch(() => undefined);
  await page.goto("/editor/sample-math");
  await page.locator("[data-sample-banner] button").click();
  await expect(dialog(page)).toBeVisible();
  // Also clear the cookies: IndexedDB remembers, and puts the others back.
  await context.clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("[data-sample-banner] button").click();
  await expect(dialog(page)).toBeVisible();
  expect((await context.cookies()).some((c) => c.name === "mathtest_trial" && c.value === "1")).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("mathtest:guest-trial"))).toBe("used");
});

test("the privacy page explains the trial cookie", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.locator("#trial-cookie")).toContainText("mathtest_trial");
});
