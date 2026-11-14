import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers";

const noSidewaysScroll = (page: import("@playwright/test").Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test("landing: the demo writes a question by itself, and stops for 'reduce motion'", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/about");
  const demo = page.locator("[data-hero-demo]");
  await demo.scrollIntoViewIfNeeded();
  // It is a picture, not a tool: hidden from screen readers.
  await expect(demo).toHaveAttribute("aria-hidden", "true");
  // The text changes while it types…
  const seen = new Set<string>();
  for (let i = 0; i < 30; i++) {
    seen.add((await demo.locator("p").first().textContent()) ?? "");
    await page.waitForTimeout(250);
  }
  expect(seen.size, "the demo is animated").toBeGreaterThan(3);

  // …and stands still (a finished question) when the computer asks for less motion.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await demo.scrollIntoViewIfNeeded();
  const first = await demo.textContent();
  await page.waitForTimeout(1500);
  expect(await demo.textContent()).toBe(first);
  await expect(demo.locator("li")).toHaveCount(4);
  expect(errors).toEqual([]);
});

test("landing: subjects open their samples, prices come from the plan, reviews are marked as placeholders", async ({ page }) => {
  await page.goto("/about");
  const subjects = page.locator("[data-landing-subjects] a");
  await expect(subjects).toHaveCount(8);
  await expect(page.locator("[data-landing-pricing]")).toContainText("₾");
  // Until real reviews exist, every card says it is a placeholder.
  const reviews = page.locator("[data-landing-testimonials] figure");
  await expect(reviews).toHaveCount(3);
  for (let i = 0; i < 3; i++) await expect(reviews.nth(i)).toContainText("ადგილი შეფასებისთვის");
  await subjects.first().click();
  await page.waitForURL("**/print/sample-math");
});

for (const size of [
  { name: "tablet", width: 820, height: 1180 },
  { name: "phone", width: 360, height: 740 },
]) {
  test(`landing fits a ${size.name} (no sideways scroll, the try button is on the first screen)`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/about");
    expect(await noSidewaysScroll(page)).toBe(true);
    await expect(page.locator("[data-try-button]").first()).toBeInViewport();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    expect(await noSidewaysScroll(page)).toBe(true);
  });
}
