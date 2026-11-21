import { expect, test } from "@playwright/test";
import { cards, editor, openSampleCopy } from "./helpers";

// Math has ONE guide video for every question type (below), no small video per card.
test("math question cards have no per-type video button", async ({ page }) => {
  await openSampleCopy(page, "math");
  await expect(cards(page).first()).toBeVisible();
  await expect(editor(page).locator("[data-tutorial-open]")).toHaveCount(0);
});

// "▶ Video" in the editor's top bar (and the "add a question" panel): every math
// question type in one video, with chapters to jump to.
test("the math editor offers the all-types guide with chapters", async ({ page }) => {
  await openSampleCopy(page, "math");
  await editor(page).locator('[data-guide-open="math-all-types"]').first().click();

  const dialog = page.locator('[data-tutorial-dialog="math-all-types"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-tutorial-video]")).toHaveAttribute("src", "/tutorials/math-all-types.ka.webm");
  const chapters = dialog.locator("[data-tutorial-chapters] button");
  await expect(chapters.first()).toContainText("არჩევითი პასუხით");
  expect(await chapters.count()).toBeGreaterThanOrEqual(6);

  // A chapter jumps there (and is marked as the one playing).
  const matching = chapters.filter({ hasText: "შესაბამისობა" });
  await matching.click();
  await page.waitForFunction(() => {
    const v = document.querySelector<HTMLVideoElement>('[data-tutorial-dialog="math-all-types"] video');
    return v !== null && v.currentTime > 30 && !v.paused;
  });
  await expect(matching).toHaveAttribute("aria-current", "step");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  // The same guide from the "add a question" panel.
  await editor(page).locator('[data-guide-open="math-all-types"]').last().click();
  await expect(dialog).toBeVisible();
});

test("subjects without a guide video don't show the button", async ({ page }) => {
  await openSampleCopy(page, "history");
  await expect(editor(page).locator("[data-guide-open]")).toHaveCount(0);
});
