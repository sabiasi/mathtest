import { expect, test } from "@playwright/test";
import { boxContent, cards, openSampleCopy, questionBox, screenTop, scrollY, SUBJECTS, toolbar as toolbarOf, typingArea } from "./helpers";

/**
 * The bug teachers reported: clicking a symbol made the page jump and the
 * cursor lose its place. Rules checked here, for every subject's toolbar:
 *   - a toolbar click never scrolls the page and never moves the box on screen
 *   - focus stays in the box that was being edited
 *   - the symbol is inserted (the box's content changes)
 */
for (const subject of SUBJECTS) {
  test(`${subject}: toolbar clicks never move the page`, async ({ page }) => {
    await openSampleCopy(page, subject);
    const count = await cards(page).count();
    const box = questionBox(page, Math.floor(count / 2));
    await box.scrollIntoViewIfNeeded();
    await typingArea(box).click();
    const toolbar = toolbarOf(page);
    await expect(toolbar).toBeVisible();
    await page.waitForTimeout(400); // the toolbar's opening animation
    await page.keyboard.press("Meta+ArrowDown"); // cursor to the end (on a Mac, End scrolls the page)

    const tabs = toolbar.locator('[role="tab"]');
    const tabCount = await tabs.count();
    let clicks = 0;
    for (let t = 0; t < Math.max(1, tabCount); t++) {
      // Switching tabs must not move anything either.
      const before = { y: await scrollY(page), top: await screenTop(box) };
      if (tabCount > 0) await tabs.nth(t).click();
      await page.waitForTimeout(120);
      expect({ y: await scrollY(page), top: await screenTop(box) }, `switching to tab ${t}`).toEqual(before);

      const buttons = toolbar.locator('[role="tabpanel"] button[aria-label]');
      const n = await buttons.count();
      // First, middle and last button of every tab.
      for (const i of [...new Set([0, Math.floor(n / 2), n - 1])].filter((n) => n >= 0)) {
        const label = await buttons.nth(i).getAttribute("aria-label");
        const pos = { y: await scrollY(page), top: await screenTop(box) };
        const kind = await buttons.nth(i).getAttribute("data-kind");
        const content = await boxContent(box);
        await buttons.nth(i).click();
        await page.waitForTimeout(150);
        const where = `tab ${t}, button "${label}"`;
        expect(await scrollY(page), `${where}: page scroll`).toBe(pos.y);
        expect(Math.abs((await screenTop(box)) - pos.top), `${where}: the box moved on screen`).toBeLessThanOrEqual(1);
        expect(await box.evaluate((el) => el.contains(document.activeElement)), `${where}: focus stays in the box`).toBe(true);
        // Formatting buttons (bold…) change how the next typed text looks; the rest insert something.
        if (kind !== "format") expect(await boxContent(box), `${where}: something was inserted`).not.toBe(content);
        clicks++;
        // Leave the formula / chemistry box so the next button starts from text again.
        await page.keyboard.press("Escape");
        await typingArea(box).click();
        await page.keyboard.press("Meta+ArrowDown"); // cursor to the end (on a Mac, End scrolls the page)
        await page.waitForTimeout(80);
      }
    }
    expect(clicks).toBeGreaterThan(0);
  });
}

test("the toolbar stays visible while scrolling a long test", async ({ page }) => {
  await openSampleCopy(page, "math");
  const box = questionBox(page, 2);
  await typingArea(box).click();
  const toolbar = toolbarOf(page);
  await expect(toolbar).toBeVisible();
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(300);
  await expect(toolbar).toBeInViewport();
  expect(await screenTop(toolbar)).toBeLessThan(120);
});

test("opening and closing the toolbar does not push the page content", async ({ page }) => {
  await openSampleCopy(page, "math");
  const box = questionBox(page, 8);
  // Put the box in the middle of the window (well below where the toolbar opens).
  await box.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 450));
  await page.waitForTimeout(200);
  const before = { y: await scrollY(page), top: await screenTop(box) };
  await typingArea(box).click();
  await expect(toolbarOf(page)).toBeVisible();
  await page.waitForTimeout(500);
  expect({ y: await scrollY(page), top: await screenTop(box) }, "after the toolbar opened").toEqual(before);
  // Closing it (clicking the points box) doesn't move anything either.
  await cards(page).nth(8).locator("input").first().click();
  await expect(toolbarOf(page)).toBeHidden();
  await page.waitForTimeout(400);
  expect({ y: await scrollY(page), top: await screenTop(box) }, "after the toolbar closed").toEqual(before);
});

test("a box that the toolbar would cover is moved just below it", async ({ page }) => {
  await openSampleCopy(page, "math");
  const box = questionBox(page, 8);
  // The box right under the top bar: exactly where the toolbar will open.
  await box.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 80));
  await page.waitForTimeout(200);
  await typingArea(box).click();
  const toolbar = toolbarOf(page);
  await expect(toolbar).toBeVisible();
  await page.waitForTimeout(500);
  const toolbarBottom = await toolbar.evaluate((el) => Math.round(el.getBoundingClientRect().bottom));
  const top = await screenTop(box);
  expect(top, "the box is visible under the toolbar").toBeGreaterThanOrEqual(toolbarBottom);
  expect(top - toolbarBottom, "…and it moved no further than needed").toBeLessThanOrEqual(40);
});
