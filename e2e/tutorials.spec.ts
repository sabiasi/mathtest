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

  // Our own control bar is always there: pause, +5 s / −5 s, ← / → keys, the timeline.
  const time = () => dialog.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime);
  await dialog.locator("[data-tutorial-play]").click();
  await page.waitForFunction(() => document.querySelector<HTMLVideoElement>('[data-tutorial-dialog="math-all-types"] video')?.paused === true);
  let before = await time();
  await dialog.locator("[data-tutorial-forward]").click();
  expect(await time()).toBeCloseTo(before + 5, 0);
  before = await time();
  await dialog.locator("[data-tutorial-back]").click();
  expect(await time()).toBeCloseTo(before - 5, 0);
  before = await time();
  await page.keyboard.press("ArrowRight");
  expect(await time()).toBeCloseTo(before + 5, 0);
  await dialog.locator("[data-tutorial-seek]").fill("90");
  expect(await time()).toBeCloseTo(90, 0);
  await expect(dialog.locator("[data-tutorial-time]")).toContainText("1:30");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  // The same guide from the "add a question" panel.
  await editor(page).locator('[data-guide-open="math-all-types"]').last().click();
  await expect(dialog).toBeVisible();
});

// History has its own guide (paper view + variants); chemistry has none yet.
test("the history editor offers its own guide", async ({ page }) => {
  await openSampleCopy(page, "history");
  await editor(page).locator('[data-guide-open="history-all-types"]').first().click();
  const dialog = page.locator('[data-tutorial-dialog="history-all-types"]');
  await expect(dialog.locator("[data-tutorial-video]")).toHaveAttribute("src", "/tutorials/history-all-types.ka.webm");
  await expect(dialog.locator("[data-tutorial-chapters] button").first()).toContainText("ტესტი ქაღალდზე");
});

// History's and math's guides also come up as a corner card in the editor, once per visit.
for (const subject of ["history", "math"] as const) {
  test(`the ${subject} editor invites to its guide once per visit`, async ({ page }) => {
    const name = `${subject}-all-types`;
    await openSampleCopy(page, subject);
    const card = page.locator(`[data-video-card="${name}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText("ნახეთ, როგორ იქმნება ტესტი");
    await expect(card.locator("img")).toHaveAttribute("src", `/tutorials/${name}.ka.jpg`);
    await card.locator("[data-promo-watch]").click();
    await expect(card).toHaveCount(0);
    const dialog = page.locator(`[data-tutorial-dialog="${name}"]`);
    await expect(dialog.locator("[data-tutorial-video]")).toHaveAttribute("src", `/tutorials/${name}.ka.webm`);
    await page.keyboard.press("Escape");

    // Same visit: not again.
    await page.reload();
    await editor(page).locator("[data-guide-open]").first().waitFor();
    await page.waitForTimeout(2500); // longer than the card's 1.5 s delay
    await expect(page.locator("[data-video-card]")).toHaveCount(0);
  });
}

test("subjects without a guide video don't show the button", async ({ page }) => {
  await openSampleCopy(page, "chemistry");
  await expect(editor(page).locator("[data-guide-open]")).toHaveCount(0);
});
