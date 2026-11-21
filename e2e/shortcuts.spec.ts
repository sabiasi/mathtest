import { expect, test, type Locator, type Page } from "@playwright/test";
import { boxContent, cards, editor, openSampleCopy, questionBox, toolbar, typingArea } from "./helpers";

/** A fresh open question at the end of the test, with its text box focused. */
async function newQuestion(page: Page) {
  await editor(page).locator('[data-add-type="open-answer"]').click();
  const box = questionBox(page, (await cards(page).count()) - 1);
  await expect(typingArea(box)).toBeFocused();
  return box;
}

const formulas = async (box: Locator): Promise<string[]> => JSON.parse(await boxContent(box)).math;

/**
 * What a teacher types inside a formula → what must appear (as LaTeX).
 * The same list the toolbar's "typing shortcuts" help shows (MATH_SHORTCUTS),
 * plus the Georgian function names.
 */
const TYPED: [keys: string, expected: RegExp][] = [
  ["a/b", /^\\frac\{?a\}?\{?b\}?$/],
  ["x^2", /^x\^\{?2\}?$/],
  ["x_1", /^x_\{?1\}?$/],
  ["sqrt", /^\\sqrt\{/],
  ["pi", /^\\pi\s*$/],
  ["alpha", /^\\alpha\s*$/],
  ["beta", /^\\beta\s*$/],
  ["<=", /^\\(le|leq)\s*$/],
  [">=", /^\\(ge|geq)\s*$/],
  ["!=", /^\\(ne|neq)\s*$/],
  ["->", /^\\(to|rightarrow)\s*$/],
  ["oo", /^\\infty\s*$/],
  ["sin", /^\\sin\s*$/],
  ["tg", /^\\operatorname\{tg\}\s*$/],
  ["ctg", /^\\operatorname\{ctg\}\s*$/],
  ["arctg", /^\\operatorname\{arctg\}\s*$/],
  ["lg", /^\\lg\s*$/],
  ["ln", /^\\ln\s*$/],
  ["sum", /^\\sum/],
  ["int", /^\\int/],
  ["(", /^\\left\(\\right\)$/],
];

test("typing shortcuts inside a formula: sqrt, pi, a/b, x^2, tg…", async ({ page }) => {
  await openSampleCopy(page, "math");
  const box = await newQuestion(page);
  for (const [keys, expected] of TYPED) {
    await toolbar(page).locator("[data-insert-formula]").click();
    await expect(box.locator("math-field")).toBeFocused();
    await page.keyboard.type(keys, { delay: 20 });
    await expect.poll(async () => (await formulas(box))[0] ?? "", { message: `typing "${keys}"` }).toMatch(expected);
    // Remove the formula for the next one: leave it, select everything, delete.
    await page.keyboard.press("Escape");
    await typingArea(box).click();
    await page.keyboard.press("Meta+a");
    await page.keyboard.press("Backspace");
    await expect.poll(async () => (await formulas(box)).length).toBe(0);
  }
});

test("the shortcuts help opens from the toolbar and lists what to type", async ({ page }) => {
  await openSampleCopy(page, "math");
  await newQuestion(page);
  await toolbar(page).locator("[data-shortcuts-button]").click();
  const help = toolbar(page).locator("[data-shortcuts]");
  await expect(help).toBeVisible();
  await expect(help.locator("kbd", { hasText: /^sqrt$/ })).toBeVisible();
  // A tab click goes back to the symbols.
  await toolbar(page).locator('[role="tab"]').first().click();
  await expect(help).toBeHidden();
});

test("symbol search: Georgian or English words, Enter inserts at the cursor", async ({ page }) => {
  await openSampleCopy(page, "math");
  const box = await newQuestion(page);
  await page.keyboard.type("AB");
  await page.keyboard.press("ArrowLeft");
  const search = toolbar(page).locator("[data-symbol-search]");
  await search.click();
  await expect(toolbar(page), "the toolbar stays open while searching").toBeVisible();
  await page.keyboard.type("ფესვი");
  await expect(toolbar(page).locator('[role="tabpanel"] button[data-key="m:\\\\sqrt{#@}"]')).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(box.locator("math-field")).toBeFocused();
  expect((await formulas(box))[0]).toContain("\\sqrt");
  // The formula went between A and B, where the cursor was before searching.
  const order = await box.evaluate((el) => [...el.querySelector(".ProseMirror p")!.childNodes].map((n) => (n.nodeType === 3 ? n.textContent : (n as HTMLElement).className)).filter((x) => x && !String(x).includes("separator")));
  expect(order).toEqual(["A", "math-node", "B"]);

  // English word, clicked with the mouse: goes into the same formula.
  await search.click();
  await page.keyboard.type("alpha");
  await toolbar(page).locator('[role="tabpanel"] button[data-key="m:\\\\alpha"]').click();
  expect(await formulas(box)).toHaveLength(1);
  expect((await formulas(box))[0]).toContain("\\alpha");

  // Nothing found: a friendly message; Escape clears the search.
  await search.click();
  await page.keyboard.type("zzzz");
  await expect(toolbar(page).locator("[data-no-symbols]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(search).toHaveValue("");
});

test("matrix buttons: add a row inside a matrix; outside one, a hint instead of an error", async ({ page }) => {
  await openSampleCopy(page, "math");
  const box = await newQuestion(page);
  await toolbar(page).getByRole("tab", { name: "მატრიცები" }).click();
  const addRow = toolbar(page).locator('button[data-key="c:addRowAfter"]');
  await addRow.click(); // no formula yet
  await expect(page.locator("[data-sonner-toast]", { hasText: "მატრიცის" })).toBeVisible();
  await toolbar(page).locator('[role="tabpanel"] button[data-kind="math"]').first().click(); // 2×2
  await expect(box.locator("math-field")).toBeFocused();
  const rows = async () => ((await formulas(box))[0].match(/\\\\/g) ?? []).length + 1;
  expect(await rows()).toBe(2);
  await addRow.click();
  await expect.poll(rows).toBe(3);
});
