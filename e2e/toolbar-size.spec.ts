import { expect, test, type Page } from "@playwright/test";
import { cards, editor, openSampleCopy, questionBox, scrollY, screenTop, toolbar, typingArea } from "./helpers";

/**
 * The teacher controls how much of the window the toolbar takes:
 * hidden symbols / compact / expanded / any height (drag or keyboard),
 * remembered in this browser. The box being edited is never covered.
 */
const panel = (page: Page) => toolbar(page).locator("[data-toolbar-panel]");
const handle = (page: Page) => toolbar(page).locator("[data-toolbar-resize]");
const panelHeight = async (page: Page) => Math.round((await panel(page).boundingBox())!.height);
const toolbarBottom = (page: Page) => toolbar(page).evaluate((el) => Math.round(el.getBoundingClientRect().bottom));
const savedSize = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("mathtest:toolbar-size:v1") ?? "null"));

async function openToolbar(page: Page, subject: Parameters<typeof openSampleCopy>[1] = "math", question = 2) {
  await openSampleCopy(page, subject);
  const box = questionBox(page, question);
  await typingArea(box).click();
  await expect(typingArea(box)).toBeFocused();
  await expect(toolbar(page)).toBeVisible();
  await expect(panel(page)).toBeVisible();
  return box;
}

test("the toolbar starts compact, and there is no 'recently used' row", async ({ page }) => {
  const box = await openToolbar(page);
  expect(await panelHeight(page)).toBe(92);
  await expect(toolbar(page).locator('[data-size="compact"]')).toHaveAttribute("aria-pressed", "true");
  // Much less than half the window (it used to be about 255 px + the bar).
  const bar = editor(page).locator("[data-editor-bar]");
  const covered = (await toolbarBottom(page)) - (await screenTop(bar));
  expect(covered).toBeLessThan(800 * 0.4);
  // Use a symbol: no "recently used" row appears, nothing is stored for it, the height stays.
  const before = await toolbarBottom(page);
  await toolbar(page).locator('[role="tabpanel"] button[data-kind="math"]').first().click();
  await expect(box.locator("math-field:focus")).toHaveCount(1);
  await expect(toolbar(page).locator("[data-recent]")).toHaveCount(0);
  await expect(toolbar(page)).not.toContainText("ბოლოს გამოყენებული");
  expect(await toolbarBottom(page)).toBe(before);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes("recent")))).toEqual([]);
  // No empty gap is left where the row used to be: the panel follows the tabs directly.
  const tabsBottom = await toolbar(page).locator('[role="tablist"]').evaluate((el) => el.getBoundingClientRect().bottom);
  expect((await panel(page).boundingBox())!.y - tabsBottom).toBeLessThanOrEqual(10);
});

test("compact / expanded buttons: the size is kept across tabs, search, shortcuts, subjects and reloads", async ({ page }) => {
  const box = await openToolbar(page);
  await toolbar(page).locator('[data-size="expanded"]').click();
  await expect.poll(() => panelHeight(page)).toBe(180);
  await expect(typingArea(box), "focus stays in the box").toBeFocused();
  await expect(toolbar(page).locator('[data-size="expanded"]')).toHaveAttribute("aria-pressed", "true");
  await expect(toolbar(page).locator('[data-size="compact"]')).toHaveAttribute("aria-pressed", "false");
  expect(await savedSize(page)).toEqual({ height: 180, collapsed: false });

  // Tabs, the shortcuts list and search results all use the chosen height.
  const bottom = await toolbarBottom(page);
  const tabs = toolbar(page).locator('[role="tab"]');
  for (let i = 0; i < (await tabs.count()); i++) {
    await tabs.nth(i).click();
    expect(await toolbarBottom(page), `tab ${i}`).toBe(bottom);
  }
  await toolbar(page).locator("[data-shortcuts-button]").click();
  await expect(toolbar(page).locator("[data-shortcuts]")).toBeVisible();
  expect(await toolbarBottom(page), "shortcuts").toBe(bottom);
  await toolbar(page).locator("[data-symbol-search]").fill("alpha");
  await expect(toolbar(page).locator('[role="tabpanel"] button[data-key="m:\\\\alpha"]')).toBeVisible();
  expect(await toolbarBottom(page), "search").toBe(bottom);

  // Remembered after a reload…
  await page.reload();
  await typingArea(questionBox(page, 2)).click();
  await expect(panel(page)).toBeVisible();
  expect(await panelHeight(page)).toBe(180);
  // …and in another subject.
  await openSampleCopy(page, "physics");
  await typingArea(questionBox(page, 2)).click();
  await expect(panel(page)).toBeVisible();
  expect(await panelHeight(page)).toBe(180);
  await toolbar(page).locator('[data-size="compact"]').click();
  await expect.poll(() => panelHeight(page)).toBe(92);
});

test("collapsing hides the symbols but keeps formatting, search and the expand button", async ({ page }) => {
  const box = await openToolbar(page);
  const full = await toolbarBottom(page);
  const collapse = toolbar(page).locator("[data-toolbar-collapse]");
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await collapse.click();
  await expect(panel(page)).toHaveCount(0);
  await expect(toolbar(page).locator('[role="tablist"]')).toHaveCount(0);
  await expect(collapse).toHaveAttribute("aria-expanded", "false");
  await expect(typingArea(box)).toBeFocused();
  await expect.poll(() => toolbarBottom(page)).toBeLessThan(full - 100);
  const collapsedBottom = await toolbarBottom(page);
  expect(collapsedBottom - (await screenTop(toolbar(page))), "only one row of controls is left").toBeLessThanOrEqual(64);

  // Still reachable: the formula button, B I U ▭, search.
  await expect(toolbar(page).locator("[data-insert-formula]")).toBeVisible();
  await toolbar(page).locator('[data-key="f:bold"]').click();
  await expect(toolbar(page).locator('[data-key="f:bold"]')).toHaveAttribute("aria-pressed", "true");
  await toolbar(page).locator('[data-key="f:bold"]').click();

  // Searching shows the results meanwhile; clearing the search hides them again.
  const search = toolbar(page).locator("[data-symbol-search]");
  await search.fill("alpha");
  await expect(toolbar(page).locator('[role="tabpanel"] button[data-key="m:\\\\alpha"]')).toBeVisible();
  const formulas = await box.locator("math-field").count();
  await search.press("Enter"); // inserts the best match and clears the search
  await expect(box.locator("math-field")).toHaveCount(formulas + 1);
  await expect(panel(page)).toHaveCount(0);

  // Collapsed is remembered too.
  expect((await savedSize(page)).collapsed).toBe(true);
  await page.reload();
  await typingArea(questionBox(page, 2)).click();
  await expect(toolbar(page)).toBeVisible();
  await expect(panel(page)).toHaveCount(0);
  await toolbar(page).locator("[data-toolbar-collapse]").click();
  await expect(panel(page)).toBeVisible();
  expect(await panelHeight(page)).toBe(92);
});

test("dragging the handle resizes the panel between its smallest and tallest size", async ({ page }) => {
  const box = await openToolbar(page);
  const grip = (await handle(page).boundingBox())!;
  const x = grip.x + grip.width / 2;
  const y = grip.y + grip.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 60, { steps: 6 });
  await expect.poll(() => panelHeight(page)).toBe(152);
  await page.mouse.up();
  await expect(typingArea(box), "the cursor stays in the box while dragging").toBeFocused();
  expect(await savedSize(page)).toEqual({ height: 152, collapsed: false });
  // Neither ready-made size is lit now.
  await expect(toolbar(page).locator('[data-size="compact"]')).toHaveAttribute("aria-pressed", "false");

  // Far down: stops at the tallest allowed (room is left for the question).
  const max = Number(await handle(page).getAttribute("aria-valuemax"));
  const at = (await handle(page).boundingBox())!;
  await page.mouse.move(x, at.y + at.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, 790, { steps: 8 });
  await page.mouse.up();
  expect(await panelHeight(page)).toBe(max);
  expect(800 - (await toolbarBottom(page)), "room left under the toolbar").toBeGreaterThanOrEqual(180);
  // Far up: stops at one row of symbols.
  const top = (await handle(page).boundingBox())!;
  await page.mouse.move(x, top.y + top.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, 0, { steps: 8 });
  await page.mouse.up();
  expect(await panelHeight(page)).toBe(48);
  // What doesn't fit scrolls INSIDE the panel; buttons keep their size.
  const sizes = await panel(page).evaluate((el) => ({ scrolls: el.scrollHeight > el.clientHeight, button: el.querySelector("button")!.getBoundingClientRect().height }));
  expect(sizes.scrolls).toBe(true);
  expect(sizes.button).toBe(40);
});

test("the handle works from the keyboard", async ({ page }) => {
  await openToolbar(page);
  await handle(page).focus();
  await expect(toolbar(page), "the toolbar stays open while its handle has the focus").toBeVisible();
  const y = await scrollY(page);
  await page.keyboard.press("ArrowDown");
  await expect(handle(page)).toHaveAttribute("aria-valuenow", "108");
  expect(await panelHeight(page)).toBe(108);
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  expect(await panelHeight(page)).toBe(76);
  await page.keyboard.press("Home");
  expect(await panelHeight(page)).toBe(48);
  await page.keyboard.press("End");
  expect(await panelHeight(page)).toBe(Number(await handle(page).getAttribute("aria-valuemax")));
  await page.keyboard.press("PageUp");
  expect(await savedSize(page)).toEqual({ height: Number(await handle(page).getAttribute("aria-valuemax")) - 44, collapsed: false });
  expect(await scrollY(page), "the arrow keys resize, they don't scroll the page").toBeLessThanOrEqual(y);
});

test("growing the toolbar never covers the box being edited", async ({ page }) => {
  await openSampleCopy(page, "math");
  const box = questionBox(page, 8);
  // The box right under the compact toolbar.
  await typingArea(box).click();
  await expect(panel(page)).toBeVisible();
  await box.evaluate((el, bottom) => window.scrollBy(0, el.getBoundingClientRect().top - bottom - 14), await toolbarBottom(page));
  const y = await scrollY(page);
  // Mouse: expanded.
  await toolbar(page).locator('[data-size="expanded"]').click();
  await expect.poll(() => panelHeight(page)).toBe(180);
  await expect.poll(async () => (await screenTop(box)) - (await toolbarBottom(page))).toBeGreaterThanOrEqual(0);
  expect(y - (await scrollY(page)), "scrolled only as far as needed").toBeLessThanOrEqual(88 + 40);
  // Keyboard on the handle (the focus is on the toolbar now): still kept visible.
  await handle(page).focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown");
  await expect.poll(async () => (await screenTop(box)) - (await toolbarBottom(page))).toBeGreaterThanOrEqual(0);
  // Shrinking never scrolls.
  const settled = await scrollY(page);
  await toolbar(page).locator('[data-size="compact"]').click();
  await expect.poll(() => panelHeight(page)).toBe(92);
  expect(await scrollY(page)).toBe(settled);
  // Nothing keeps moving afterwards (no resize ↔ scroll loop).
  await page.waitForTimeout(300);
  expect(await scrollY(page)).toBe(settled);
});

test("a saved size is fitted to the window again when the window changes", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mathtest:toolbar-size:v1", JSON.stringify({ height: 420, collapsed: false })));
  await openToolbar(page);
  const tall = await panelHeight(page);
  expect(tall).toBeLessThan(420);
  expect(tall).toBe(Number(await handle(page).getAttribute("aria-valuemax")));
  // A much shorter window: the panel shrinks so the question stays reachable.
  await page.setViewportSize({ width: 1280, height: 520 });
  await expect.poll(() => panelHeight(page)).toBeLessThan(tall);
  expect(520 - (await toolbarBottom(page))).toBeGreaterThanOrEqual(180);
  // Back to a tall window: the chosen height returns (it was never overwritten).
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(() => panelHeight(page)).toBe(tall);
  expect((await savedSize(page)).height).toBe(420);
});

test("broken or blocked storage falls back to the compact size", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mathtest:toolbar-size:v1", "{not json"));
  await openToolbar(page);
  expect(await panelHeight(page)).toBe(92);
  // Storage that refuses to save: the size still changes for this visit, without errors.
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await toolbar(page).locator('[data-size="expanded"]').click();
  await expect.poll(() => panelHeight(page)).toBe(180);
  expect(errors).toEqual([]);
});

test("phone: the handle can be dragged by touch, and the toolbar leaves room for the question", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await openSampleCopy(page, "math");
  const box = questionBox(page, 2);
  await typingArea(box).tap();
  await expect(panel(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no sideways scroll").toBe(true);
  // Touch targets stay usable.
  const collapse = (await toolbar(page).locator("[data-toolbar-collapse]").boundingBox())!;
  expect(Math.min(collapse.width, collapse.height)).toBeGreaterThanOrEqual(36);
  expect((await handle(page).boundingBox())!.height).toBeGreaterThanOrEqual(24);
  const before = await panelHeight(page);
  // A finger drag on the handle (pointer events of type "touch").
  const grip = (await handle(page).boundingBox())!;
  const x = grip.x + grip.width / 2;
  const y = grip.y + grip.height / 2;
  const client = await context.newCDPSession(page);
  const touch = (type: string, ty: number) =>
    client.send("Input.dispatchTouchEvent", { type: type as "touchStart", touchPoints: type === "touchEnd" ? [] : [{ x, y: ty }] });
  await touch("touchStart", y);
  for (let step = 1; step <= 5; step++) await touch("touchMove", y + step * 10);
  await touch("touchEnd", y + 50);
  await expect.poll(() => panelHeight(page)).toBe(before + 50);
  expect(800 - (await toolbarBottom(page))).toBeGreaterThanOrEqual(180);
  await toolbar(page).locator("[data-toolbar-collapse]").tap();
  await expect(panel(page)).toHaveCount(0);
  await expect(toolbar(page).locator('[data-key="f:bold"]')).toBeVisible();
  await expect(toolbar(page).locator("[data-symbol-search]")).toBeVisible();
  await context.close();
});

test("the last card's box stays usable with the tallest toolbar", async ({ page }) => {
  await openSampleCopy(page, "chemistry");
  const last = (await cards(page).count()) - 1;
  const box = questionBox(page, last);
  await typingArea(box).click();
  await expect(panel(page)).toBeVisible();
  await handle(page).focus();
  await page.keyboard.press("End");
  await typingArea(box).click();
  await page.keyboard.type("xyz");
  await expect(typingArea(box)).toContainText("xyz");
  expect(await screenTop(box)).toBeGreaterThanOrEqual(await toolbarBottom(page));
});
