import { test } from "@playwright/test";
test("debug", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.clock.runFor(2000);
  const bar = page.locator("[data-promo-card] [aria-hidden] > span").last();
  const show = async (s: string) => console.log(s, await page.locator("[data-promo-card]").count(), await bar.getAttribute("style").catch(() => "-"));
  await show("start");
  await page.clock.runFor(3000);
  await show("after 3s");
  await page.locator("[data-promo-card]").hover();
  await page.clock.runFor(5000);
  await show("hovered 5s");
  await page.mouse.move(10, 10);
  await page.clock.runFor(3000);
  await show("left 3s");
  await page.clock.runFor(8000);
  await show("left 11s");
});
