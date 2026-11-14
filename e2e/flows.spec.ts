import { expect, test } from "@playwright/test";
import { boxContent, cards, collectErrors, editor, openSampleCopy, questionBox, typingArea } from "./helpers";

// A tiny red PNG (1×1), as a teacher's "picture".
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64");

test("typing and leaving at once loses nothing (autosave on leave)", async ({ page }) => {
  await openSampleCopy(page, "history");
  const url = page.url();
  await editor(page).locator('[data-add-type="short-answer"]').click();
  await page.keyboard.type("ბოლო წამის ცვლილება");
  // No waiting for the autosave delay: go back straight away.
  await editor(page).getByRole("link", { name: "ჩემი ტესტები" }).first().click();
  await page.waitForURL("**/tests");
  await page.goto(url);
  const last = questionBox(page, (await cards(page).count()) - 1);
  await expect(typingArea(last)).toContainText("ბოლო წამის ცვლილება");
});

test("a picture is saved with the question, survives a reload and prints", async ({ page }) => {
  const errors = collectErrors(page);
  await openSampleCopy(page, "georgian");
  const card = cards(page).nth(1);
  await card.locator('input[type="file"]').first().setInputFiles({ name: "red.png", mimeType: "image/png", buffer: PNG });
  await expect(card.locator("img").first()).toBeVisible();
  await expect(editor(page).locator('[data-save-state="saved"]')).toBeVisible();
  await page.reload();
  await expect(cards(page).nth(1).locator("img").first()).toBeVisible();
  const id = page.url().split("/").pop();
  await page.goto(`/print/${id}`);
  await expect(page.locator('[data-print-ready="true"]:visible')).toBeVisible({ timeout: 30_000 });
  const img = page.locator(".sheet:visible img").first();
  await expect(img).toBeVisible();
  expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  expect(errors).toEqual([]);
});

test("the PDF button downloads a real PDF (student version of a sample)", async ({ page }) => {
  test.slow();
  await page.goto("/print/sample-math");
  await expect(page.locator('[data-print-ready="true"]:visible')).toBeVisible({ timeout: 30_000 });
  const download = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByRole("button", { name: /PDF/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.pdf$/);
  const path = await file.path();
  const head = (await import("node:fs")).readFileSync(path).subarray(0, 5).toString();
  expect(head).toBe("%PDF-");
});

test("changing a question's type keeps its text and points", async ({ page }) => {
  await openSampleCopy(page, "math");
  const card = cards(page).nth(0);
  const before = await boxContent(questionBox(page, 0));
  await card.locator("select").first().selectOption("short-answer");
  await expect.poll(() => boxContent(questionBox(page, 0))).toBe(before);
  expect(JSON.parse(before).math).toHaveLength(1); // the formula is still there
  await page.keyboard.press("Meta+z"); // nothing weird happens on undo in another box
  await expect(cards(page).nth(0)).toBeVisible();
});

test("the editor in English: toolbar tooltips and buttons are English", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mathtest:language", "en"));
  await openSampleCopy(page, "math");
  await typingArea(questionBox(page, 0)).click();
  await expect(editor(page).locator("[data-math-toolbar]").getByRole("button", { name: "Fraction", exact: true })).toBeVisible();
});
