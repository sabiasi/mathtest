import { expect, test } from "@playwright/test";

/**
 * The promo video card on the landing page and My tests (features/promo): it comes up on EVERY visit,
 * × closes it, it leaves by itself after 10 s (not while the mouse is on it), and a click
 * opens the video. The countdown test fakes the page clock, so it doesn't wait 10 real seconds.
 */
const card = "[data-promo-card]";

test("comes up on every visit, and × closes it", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(card)).toBeVisible();
  await expect(page.locator(card)).toContainText("ნახეთ, როგორ მუშაობს Rapido");
  await page.locator("[data-promo-close]").click();
  await expect(page.locator(card)).toHaveCount(0);

  // The next visit: there again.
  await page.reload();
  await expect(page.locator(card)).toBeVisible();
});

test("My tests shows it too, and its video plays there", async ({ page }) => {
  await page.goto("/tests");
  await expect(page.locator(card)).toBeVisible();
  await page.locator("[data-promo-watch]").click();
  await expect(page.locator("[data-promo-dialog] video[data-promo-video]")).toBeVisible();
});

test("the countdown waits while the mouse is on the card", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.clock.runFor(2000);
  const bar = page.locator("[data-promo-time-left]");
  await page.locator(card).hover();
  const before = await bar.getAttribute("style");
  await page.clock.runFor(15_000);
  await expect(page.locator(card)).toBeVisible();
  expect(await bar.getAttribute("style")).toBe(before);
  // Mouse away: it counts down again.
  await page.mouse.move(10, 10);
  await page.clock.runFor(3000);
  expect(await bar.getAttribute("style")).not.toBe(before);
});

test("leaves by itself after 10 seconds", async ({ page }) => {
  // Real time here: under a fake clock the slide-out animation never finishes.
  await page.goto("/");
  await expect(page.locator(card)).toBeVisible();
  await page.locator(card).waitFor({ state: "detached", timeout: 15_000 });
});

test("a click opens the video in a window", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-promo-watch]").click();
  const dialog = page.locator("[data-promo-dialog]");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("video[data-promo-video]")).toHaveAttribute("src", "/promo/rapido-promo.mp4");
  await expect(page.locator(card)).toHaveCount(0);
  // The files are really there.
  for (const file of ["/promo/rapido-promo.mp4", "/promo/rapido-promo.jpg"]) {
    expect((await page.request.head(file)).ok(), file).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
