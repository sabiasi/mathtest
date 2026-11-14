import { expect, test } from "@playwright/test";
import { boxContent, cards, editor, openSampleCopy, questionBox, scrollY, toolbar, typingArea } from "./helpers";

/** A fresh short-answer question at the end of the test, with its text box focused. */
async function newQuestion(page: import("@playwright/test").Page) {
  await editor(page).locator('[data-add-type="short-answer"]').click();
  const box = questionBox(page, (await cards(page).count()) - 1);
  await expect(typingArea(box)).toBeFocused();
  return box;
}

test("a text symbol is inserted exactly at the cursor", async ({ page }) => {
  await openSampleCopy(page, "geography");
  const box = await newQuestion(page);
  await page.keyboard.type("AB");
  await page.keyboard.press("ArrowLeft"); // between A and B
  await toolbar(page).locator('button[data-kind="text"]', { hasText: "°" }).first().click();
  await page.keyboard.type("x");
  expect(JSON.parse(await boxContent(box)).text).toBe("A°xB");
});

test("a formula is inserted at the cursor and typing continues inside it", async ({ page }) => {
  await openSampleCopy(page, "math");
  const box = await newQuestion(page);
  await page.keyboard.type("AB");
  await page.keyboard.press("ArrowLeft");
  await toolbar(page).getByRole("button", { name: "წილადი", exact: true }).click();
  await expect(box.locator("math-field")).toBeFocused();
  await page.keyboard.type("1");
  await page.keyboard.press("Tab");
  await page.keyboard.type("2");
  const content = JSON.parse(await boxContent(box));
  // MathLive writes one-digit fractions the short way: \frac12 = \frac{1}{2}.
  expect(content.math).toHaveLength(1);
  expect(content.math[0]).toMatch(/^\\frac\{?1\}?\{?2\}?$/);
  // The formula sits between A and B.
  const order = await box.evaluate((el) => [...el.querySelector(".ProseMirror p")!.childNodes].map((n) => (n.nodeType === 3 ? n.textContent : (n as HTMLElement).className)).filter((x) => x && !String(x).includes("separator")));
  expect(order).toEqual(["A", "math-node", "B"]);
  // A second symbol goes into the SAME formula, at its cursor.
  await toolbar(page).getByRole("tab", { name: "ბერძნული ასოები" }).click();
  await toolbar(page).locator('[role="tabpanel"] button[data-kind="math"]').first().click(); // α
  expect(JSON.parse(await boxContent(box)).math).toHaveLength(1);
  expect(JSON.parse(await boxContent(box)).math[0]).toContain("\\alpha");
});

test("typing in a toolbar tool does not scroll, and its result lands in the box", async ({ page }) => {
  await openSampleCopy(page, "geography");
  const box = await newQuestion(page);
  await page.keyboard.type("თბილისი: ");
  const y = await scrollY(page);
  const tool = toolbar(page).locator("[data-coordinate-tool]");
  await tool.locator("input").nth(0).click();
  await page.keyboard.type("41");
  await tool.locator("input").nth(2).click();
  await page.keyboard.type("44");
  await page.waitForTimeout(200);
  expect(await scrollY(page), "focusing the tool's inputs").toBe(y);
  await tool.locator("button").nth(2).click(); // insert, Georgian style
  expect(await scrollY(page), "inserting").toBe(y);
  expect(JSON.parse(await boxContent(box)).text).toBe("თბილისი: 41° ჩ. გ., 44° აღმ. გრძ.");
});

test("symbols work when the box is at the very bottom of the window", async ({ page }) => {
  await openSampleCopy(page, "physics");
  const box = questionBox(page, 5);
  await box.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().bottom + window.scrollY - window.innerHeight + 4));
  await typingArea(box).click();
  await page.keyboard.press("Meta+ArrowDown");
  await page.waitForTimeout(400);
  const y = await scrollY(page);
  for (let i = 0; i < 3; i++) {
    await toolbar(page).locator('[role="tabpanel"] button[aria-label]').nth(i).click();
    await page.keyboard.press("Escape");
    await typingArea(box).click();
    await page.keyboard.press("Meta+ArrowDown");
  }
  // The caret stays visible; at most the tiny scroll that keeps it in the window.
  expect(Math.abs((await scrollY(page)) - y)).toBeLessThanOrEqual(40);
});

test("undo and redo after inserting symbols keep the text right", async ({ page }) => {
  await openSampleCopy(page, "history");
  const box = await newQuestion(page);
  await page.keyboard.type("1121");
  await toolbar(page).locator('button[data-kind="text"]', { hasText: /^წ\.$/ }).click();
  expect(JSON.parse(await boxContent(box)).text).toBe("1121 წ.");
  await page.keyboard.press("Meta+z");
  expect(JSON.parse(await boxContent(box)).text).toBe("1121");
  await page.keyboard.press("Meta+Shift+z");
  expect(JSON.parse(await boxContent(box)).text).toBe("1121 წ.");
});
