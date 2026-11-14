import { expect, test, type Page } from "@playwright/test";
import { cards, editor, openSampleCopy, questionBox, typingArea } from "./helpers";

// Moving questions with the arrows, the "⋯" menu and Alt+↑/↓; options and rows too.
const text = (page: Page, n: number) => typingArea(questionBox(page, n)).innerText();
const arrows = (page: Page, n: number) => cards(page).nth(n).locator(":scope > [data-reorder]");
/** Hover the card (the arrows show) and click its arrow; Playwright waits until the cards stopped gliding. */
async function press(page: Page, n: number, way: "up" | "down") {
  await cards(page).nth(n).hover();
  await arrows(page, n).locator(`[data-move="${way}"]`).click();
}
const toastUndo = (page: Page) => page.locator("[data-sonner-toast]").getByRole("button", { name: "დაბრუნება" });

test("the arrows move a question one place, numbers follow, Undo puts it back, and it is saved", async ({ page }) => {
  await openSampleCopy(page, "math");
  const [first, second] = [await text(page, 0), await text(page, 1)];
  await expect(arrows(page, 0).locator('[data-move="up"]')).toBeDisabled();
  const last = (await cards(page).count()) - 1;
  await expect(arrows(page, last).locator('[data-move="down"]')).toBeDisabled();

  await press(page, 0, "down");
  await expect.poll(() => text(page, 0)).toBe(second);
  expect(await text(page, 1)).toBe(first);
  await expect(cards(page).nth(0)).toContainText("კითხვა 1");
  // The arrow keeps the focus, so it can be pressed again.
  await expect(arrows(page, 1).locator('[data-move="down"]')).toBeFocused();

  await toastUndo(page).click();
  await expect.poll(() => text(page, 0)).toBe(first);

  await press(page, 0, "down");
  await expect.poll(() => text(page, 0)).toBe(second);
  await expect(editor(page).locator('[data-save-state="saved"]')).toBeVisible();
  await page.reload();
  await expect(editor(page)).toBeVisible();
  await expect.poll(() => text(page, 0)).toBe(second);
});

test("the ⋯ menu moves a question to the top or the bottom", async ({ page }) => {
  await openSampleCopy(page, "physics");
  const count = await cards(page).count();
  const third = await text(page, 2);
  await cards(page).nth(2).locator("[data-question-menu]").click();
  await page.getByRole("menuitem", { name: "ბოლოში გადატანა" }).click();
  await expect.poll(() => text(page, count - 1)).toBe(third);
  await cards(page).nth(count - 1).locator("[data-question-menu]").click();
  await page.getByRole("menuitem", { name: "თავში გადატანა" }).click();
  await expect.poll(() => text(page, 0)).toBe(third);
});

test("Alt+↓ / Alt+↑ move the question being typed in, and the cursor stays in it", async ({ page }) => {
  await openSampleCopy(page, "history");
  const area = typingArea(questionBox(page, 1));
  await area.click();
  await expect(area).toBeFocused();
  const mine = await area.innerText();
  await page.keyboard.press("Alt+ArrowDown");
  await expect.poll(() => text(page, 2)).toBe(mine);
  await expect(typingArea(questionBox(page, 2))).toBeFocused();
  await page.keyboard.type("!");
  await expect.poll(() => text(page, 2)).toContain("!");
  await page.keyboard.press("Alt+ArrowUp");
  await page.keyboard.press("Alt+ArrowUp");
  await expect.poll(() => text(page, 0)).toContain("!");
  await expect(typingArea(questionBox(page, 0))).toBeFocused();
});

test("the arrows are soft until hover or focus", async ({ page }) => {
  await openSampleCopy(page, "math");
  await page.mouse.move(0, 0);
  await expect(arrows(page, 1)).toHaveCSS("opacity", "0");
  await cards(page).nth(1).hover();
  await expect(arrows(page, 1)).toHaveCSS("opacity", "1");
  await expect(arrows(page, 1).locator('[data-move="up"]')).toHaveAccessibleName(/ზემოთ გადატანა/);
});

test("multiple-choice options move with their arrows, and the paper follows", async ({ page }) => {
  await openSampleCopy(page, "physics");
  const card = cards(page).first();
  const options = card.locator("ul > li");
  const firstOption = await options.nth(0).locator(".ProseMirror").innerText();
  await options.nth(0).locator('[data-move="down"]').click();
  await expect(options.nth(1).locator(".ProseMirror")).toHaveText(firstOption);
  const id = page.url().split("/editor/")[1];
  await expect(editor(page).locator('[data-save-state="saved"]')).toBeVisible();
  await page.goto(`/print/${id}`);
  await expect(page.locator('[data-print-ready="true"]')).toBeVisible();
  await expect(page.locator(".sheet .print-option").nth(1)).toContainText(firstOption.trim());
});

test.describe("touch screens", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 820, height: 1100 } });
  test("the arrows are always visible", async ({ page }) => {
    await openSampleCopy(page, "math");
    await expect(arrows(page, 1)).toHaveCSS("opacity", "1");
  });
});
