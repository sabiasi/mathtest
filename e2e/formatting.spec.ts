import { expect, test, type Locator, type Page } from "@playwright/test";
import { cards, editor, openSampleCopy, questionBox, toolbar, typingArea } from "./helpers";

/**
 * B, I, U and the word box show the TRUE formatting at the cursor — read from
 * the editor, so it is right after clicks, shortcuts, arrow keys, undo and
 * when another box becomes active.
 */
const MARKS = ["bold", "italic", "underline", "box"] as const;
const format = (page: Page, mark: (typeof MARKS)[number]) => toolbar(page).locator(`[data-format-buttons] [data-key="f:${mark}"]`);

/** Which formatting buttons are lit, e.g. "bold,underline". */
const lit = (page: Page) =>
  toolbar(page)
    .locator("[data-format-buttons] button")
    .evaluateAll((buttons) => buttons.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.getAttribute("data-key")!.slice(2)).join(","));
const expectLit = (page: Page, marks: string, message?: string) => expect.poll(() => lit(page), message).toBe(marks);

/** The HTML of what was typed (without the editor's helper elements). */
const html = (box: Locator) => typingArea(box).evaluate((el) => el.querySelector("p")!.innerHTML.replace(/<br[^>]*>/g, ""));
const selectedText = (page: Page) => page.evaluate(() => window.getSelection()!.toString());

/** A fresh open question at the end of the test, with its text box focused. */
async function newQuestion(page: Page) {
  await editor(page).locator('[data-add-type="open-answer"]').click();
  const box = questionBox(page, (await cards(page).count()) - 1);
  await expect(typingArea(box)).toBeFocused();
  await expect(toolbar(page)).toBeVisible();
  return box;
}

test("buttons light up for what will be typed next (clicks and ⌘B / ⌘I / ⌘U)", async ({ page }) => {
  await openSampleCopy(page, "english");
  const box = await newQuestion(page);
  for (const mark of MARKS) await expect(format(page, mark)).toHaveAttribute("aria-pressed", "false");

  // A click with only a cursor: "the next letters are bold".
  await page.keyboard.type("one ");
  await format(page, "bold").click();
  await expectLit(page, "bold");
  await expect(typingArea(box), "the cursor stays in the box").toBeFocused();
  await page.keyboard.type("two");
  await expectLit(page, "bold");
  // Clicking the lit button switches it off again.
  await format(page, "bold").click();
  await expectLit(page, "");
  await page.keyboard.type(" three");
  expect(await html(box)).toBe("one <strong>two</strong> three");

  // The same with the keyboard, several at once.
  await page.keyboard.press("Meta+b");
  await expectLit(page, "bold");
  await page.keyboard.press("Meta+u");
  await expectLit(page, "bold,underline");
  await page.keyboard.press("Meta+i");
  await expectLit(page, "bold,italic,underline");
  await page.keyboard.type("X");
  await page.keyboard.press("Meta+b");
  await page.keyboard.press("Meta+i");
  await expectLit(page, "underline");
  await page.keyboard.press("Meta+u");
  await expectLit(page, "");
});

test("the lit button looks different from the others, in light and in dark", async ({ page }) => {
  for (const theme of ["light", "dark"] as const) {
    await page.addInitScript((value) => localStorage.setItem("mathtest:theme", value), theme);
    await openSampleCopy(page, "math");
    await newQuestion(page);
    const look = (mark: (typeof MARKS)[number]) => format(page, mark).evaluate((el) => `${getComputedStyle(el).backgroundColor} / ${getComputedStyle(el).color}`);
    const off = await look("box");
    await format(page, "box").click();
    await expectLit(page, "box");
    await page.mouse.move(5, 5); // not hovering: the look must not depend on the mouse
    await expect.poll(() => look("box"), theme).not.toBe(off);
    expect(await look("italic"), `${theme}: the others stay as they were`).toBe(off);
    await format(page, "box").click();
    await page.mouse.move(5, 5);
    await expect.poll(() => look("box")).toBe(off);
  }
});

test("moving the cursor between formatted and plain text updates the buttons", async ({ page }) => {
  await openSampleCopy(page, "georgian");
  const box = await newQuestion(page);
  await page.keyboard.type("aaa");
  await page.keyboard.press("Meta+b");
  await page.keyboard.type("bbb");
  await page.keyboard.press("Meta+b");
  await page.keyboard.type("ccc");
  expect(await html(box)).toBe("aaa<strong>bbb</strong>ccc");
  await expectLit(page, "");
  // Arrow keys: into the bold word…
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
  await expectLit(page, "bold", "inside the bold word");
  // …and out of it again.
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
  await expectLit(page, "", "back in plain text");
  // A mouse click into the bold word.
  const bold = typingArea(box).locator("strong");
  await bold.click();
  await expectLit(page, "bold", "clicked into the bold word");
  await page.keyboard.press("Meta+ArrowRight");
  await expectLit(page, "", "at the end, in plain text");
});

test("selections: all formatted = lit, mixed = not lit; a click formats all, the next removes it", async ({ page }) => {
  await openSampleCopy(page, "history");
  const box = await newQuestion(page);
  await page.keyboard.type("aaa");
  await page.keyboard.press("Meta+b");
  await page.keyboard.type("bbb");
  // Select only the bold part.
  for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+ArrowLeft");
  await expectLit(page, "bold", "a fully bold selection");
  // Select everything: partly bold → not lit.
  await page.keyboard.press("Meta+a");
  await expectLit(page, "", "a mixed selection");
  // Click: ALL of it becomes bold; the selection is kept.
  await format(page, "bold").click();
  await expectLit(page, "bold");
  expect(await html(box)).toBe("<strong>aaabbb</strong>");
  expect(await selectedText(page), "the selection is kept").toBe("aaabbb");
  await expect(typingArea(box)).toBeFocused();
  // Underline and the word box on top: three at once.
  await format(page, "underline").click();
  await format(page, "box").click();
  await expectLit(page, "bold,underline,box");
  expect(await selectedText(page)).toBe("aaabbb");
  expect(await html(box)).toBe('<span class="rt-box"><strong><u>aaabbb</u></strong></span>');
  // Clicking the lit bold button removes only bold.
  await format(page, "bold").click();
  await expectLit(page, "underline,box");
  expect(await html(box)).toBe('<span class="rt-box"><u>aaabbb</u></span>');
});

test("undo and redo update the buttons", async ({ page }) => {
  await openSampleCopy(page, "math");
  await newQuestion(page);
  await page.keyboard.type("word");
  await page.keyboard.press("Meta+a");
  await format(page, "italic").click();
  await expectLit(page, "italic");
  await page.keyboard.press("Meta+z");
  await expectLit(page, "", "after undo");
  await page.keyboard.press("Meta+Shift+z");
  await expectLit(page, "italic", "after redo");
});

test("each box has its own state: question text ↔ answer ↔ another question", async ({ page }) => {
  await openSampleCopy(page, "math");
  const box = await newQuestion(page);
  await page.keyboard.press("Meta+b");
  await page.keyboard.type("bold question");
  await expectLit(page, "bold");
  // The answer box of the same card: plain.
  const card = cards(page).nth((await cards(page).count()) - 1);
  const answer = card.locator(".rich-text-input").nth(1);
  await typingArea(answer).click();
  await expect(typingArea(answer)).toBeFocused();
  await expectLit(page, "", "the answer box is plain");
  await page.keyboard.press("Meta+u");
  await page.keyboard.type("answer");
  await expectLit(page, "underline");
  // Back to the question: bold again, and no underline carried over.
  await typingArea(box).click();
  await expectLit(page, "bold", "back in the question");
  // Another question's plain text.
  await typingArea(questionBox(page, 1)).click();
  await expect(typingArea(questionBox(page, 1))).toBeFocused();
  await expectLit(page, "");
  // Leaving the boxes closes the toolbar; coming back shows the right state at once.
  await card.locator('input[inputmode], input[type="number"], input').first().click();
  await expect(toolbar(page)).toBeHidden();
  await typingArea(box).click();
  await expectLit(page, "bold");
});

test("inside a formula the text formatting buttons are switched off", async ({ page }) => {
  await openSampleCopy(page, "math");
  const box = await newQuestion(page);
  await page.keyboard.press("Meta+b");
  await page.keyboard.type("x");
  await expectLit(page, "bold");
  await toolbar(page).locator("[data-insert-formula]").click();
  await expect(box.locator("math-field")).toBeFocused();
  for (const mark of MARKS) await expect(format(page, mark)).toHaveAttribute("aria-disabled", "true");
  await expectLit(page, "");
  // A click does nothing there: the cursor stays in the formula.
  await format(page, "italic").click({ force: true });
  await expect(box.locator("math-field")).toBeFocused();
  await expectLit(page, "");
  // Back in the text: switched on again.
  await page.keyboard.press("Escape");
  await typingArea(box).click();
  await expect(typingArea(box)).toBeFocused();
  await expect(format(page, "bold")).not.toHaveAttribute("aria-disabled", "true");
});

test("the word box (alone and with bold + underline) survives a reload, the preview and the PDF", async ({ page }) => {
  test.slow();
  await openSampleCopy(page, "english");
  const index = await cards(page).count();
  const box = await newQuestion(page);
  await page.keyboard.type("Use ");
  await format(page, "box").click();
  await page.keyboard.type("boxed");
  await format(page, "box").click();
  await page.keyboard.type(" and ");
  await format(page, "box").click();
  await format(page, "bold").click();
  await format(page, "underline").click();
  await page.keyboard.type("all three");
  // …and a phrase in ONE box with one bold word in the middle.
  for (const mark of ["bold", "underline", "box"] as const) await format(page, mark).click();
  await page.keyboard.type(" ");
  await format(page, "box").click();
  await page.keyboard.type("go ");
  await format(page, "bold").click();
  await page.keyboard.type("went");
  await format(page, "bold").click();
  await page.keyboard.type(" gone");
  const typed =
    'Use <span class="rt-box">boxed</span> and <span class="rt-box"><strong><u>all three</u></strong></span> <span class="rt-box">go <strong>went</strong> gone</span>';
  expect(await html(box)).toBe(typed);
  await expect(editor(page).locator('[data-save-state="saved"]')).toBeVisible();

  // Saved and loaded again: the same formatting, and the buttons know it.
  await page.reload();
  const again = questionBox(page, index);
  await expect(typingArea(again)).toContainText("all three");
  expect(await html(again)).toBe(typed);
  await typingArea(again).locator("u").click();
  await expectLit(page, "bold,underline,box");

  // On paper (the preview), also with the print styles the PDF uses.
  const id = page.url().split("/").pop();
  await page.goto(`/print/${id}`);
  await expect(page.locator('[data-print-ready="true"]:visible')).toBeVisible({ timeout: 30_000 });
  for (const media of ["screen", "print"] as const) {
    await page.emulateMedia({ media });
    const boxes = page.locator(".sheet .rt-box", { hasText: /boxed|all three|went/ });
    await expect(boxes, "three boxes; the phrase with a bold word is one box").toHaveCount(3);
    expect(await boxes.nth(2).innerHTML()).toBe("go <strong>went</strong> gone");
    const first = await boxes.nth(0).evaluate((el) => ({ border: getComputedStyle(el).borderTopStyle, width: getComputedStyle(el).borderTopWidth, text: el.textContent }));
    expect(first, media).toEqual({ border: "solid", width: "1px", text: "boxed" });
    const second = await boxes.nth(1).evaluate((el) => {
      const u = el.querySelector("strong u")!;
      return { text: el.textContent, bold: Number(getComputedStyle(u).fontWeight) >= 700, line: getComputedStyle(u).textDecorationLine, border: getComputedStyle(el).borderTopStyle };
    });
    expect(second, media).toEqual({ text: "all three", bold: true, line: "underline", border: "solid" });
  }
  await page.emulateMedia({ media: "screen" });
  const download = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByRole("button", { name: /PDF/ }).click();
  const file = await download;
  const bytes = (await import("node:fs")).readFileSync(await file.path());
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  if (process.env.KEEP_PDF) await file.saveAs(process.env.KEEP_PDF);
});
