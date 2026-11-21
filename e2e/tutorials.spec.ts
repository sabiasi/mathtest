import { expect, test } from "@playwright/test";
import { cards, editor, openSampleCopy } from "./helpers";

// "▶ How to use it?" on a math multiple-choice card: a window with the short video.
test("a multiple-choice card opens its how-to video, in the interface language", async ({ page }) => {
  await openSampleCopy(page, "math");
  const card = cards(page).filter({ has: page.locator('select:has(option[value="multiple-choice"]:checked)') }).first();
  await card.locator('[data-tutorial-open="math-multiple-choice"]').click();

  const dialog = page.locator('[data-tutorial-dialog="math-multiple-choice"]');
  await expect(dialog).toBeVisible();
  const video = dialog.locator("[data-tutorial-video]");
  await expect(video).toHaveAttribute("src", "/tutorials/math-multiple-choice.ka.webm");
  // It really loads and starts by itself (silent, so the browser allows autoplay).
  await page.waitForFunction(() => {
    const v = document.querySelector<HTMLVideoElement>("[data-tutorial-video]");
    return v !== null && v.readyState >= 2 && v.currentTime > 0.2 && v.duration > 10;
  });
  await expect(dialog.getByRole("alert")).toHaveCount(0);

  // Closing it leaves the editor as it was.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(editor(page)).toBeVisible();

  // Other types have no video yet: no button.
  const open = cards(page).filter({ has: page.locator('select:has(option[value="open-answer"]:checked)') }).first();
  await expect(open.locator("[data-tutorial-open]")).toHaveCount(0);
});
