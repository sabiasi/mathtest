import { expect, test } from "@playwright/test";
import { boxContent, editor, openSampleCopy, toolbar, typingArea } from "./helpers";

/** "Instructions for students" is a rich box: symbols and formulas work there like in a question. */
test("the instructions box takes toolbar symbols and formulas, and prints them", async ({ page }) => {
  await openSampleCopy(page, "physics");
  const box = editor(page).locator("[data-test-header] .rich-text-input").last();
  await typingArea(box).click();
  await expect(typingArea(box)).toBeFocused();
  await expect(toolbar(page)).toBeVisible();

  // Clear the sample text, then type a line and press a toolbar symbol.
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("აიღეთ g = 9,8 ");
  await toolbar(page).locator('button[data-kind="text"], button[data-kind="math"]').first().click();
  await expect(typingArea(box)).toBeFocused();

  const content = JSON.parse(await boxContent(box));
  expect(content.text).toContain("აიღეთ g = 9,8");
  expect(content.text.length + content.math.length).toBeGreaterThan("აიღეთ g = 9,8".length);

  // It is saved (survives a reload) ...
  await page.waitForTimeout(1200);
  await page.reload();
  const again = editor(page).locator("[data-test-header] .rich-text-input").last();
  await expect(typingArea(again)).toContainText("აიღეთ g = 9,8");

  // ... and drawn on the printed paper.
  await editor(page).locator("[data-paper-view-toggle]").click();
  await expect(editor(page).locator("[data-live-preview] .print-instructions").first()).toContainText("აიღეთ g = 9,8");
});
