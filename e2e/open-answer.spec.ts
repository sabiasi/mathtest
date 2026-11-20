import { expect, test } from "@playwright/test";
import { cards, editor, openSampleCopy, questionBox, typingArea } from "./helpers";

/** Open answers: the teacher chooses ruled lines or blank space (mathematics starts blank). */
test("an open answer can print lines or blank space", async ({ page }) => {
  await openSampleCopy(page, "math");
  // The first open answer with blank space (the sample's short answers are open answers "on one line").
  const id = await cards(page).filter({ has: page.locator('[data-open-answer-space="blank"]') }).first().getAttribute("data-question-id");
  const card = editor(page).locator(`[data-question-card][data-question-id="${id}"]`);
  const choice = card.locator("[data-open-answer-space]");
  await expect(choice).toHaveAttribute("data-open-answer-space", "blank");
  await expect(card.locator('[data-open-answer-preview="blank"]')).toBeVisible();

  await choice.getByRole("button", { name: "ხაზებით" }).click();
  await expect(choice).toHaveAttribute("data-open-answer-space", "lines");
  await expect(card.locator('[data-open-answer-preview="lines"]')).toBeVisible();
  await expect(editor(page).locator('[data-save-state="saved"]')).toBeVisible();

  // On paper: ruled lines now (the sample's other open answers stay blank).
  const testId = page.url().split("/").pop();
  await page.goto(`/print/${testId}`);
  await expect(page.locator('[data-print-ready="true"]:visible')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".sheet:visible .print-line:not(.print-line-blank)").first()).toBeVisible();
});

/** The old "short answer" lives on as an open question "on one line", with its answer on the key. */
test("an open question on one line prints 'Answer: ___' and the key shows the answer", async ({ page }) => {
  await openSampleCopy(page, "history");
  await editor(page).locator('[data-add-type="open-answer"]').click();
  const card = cards(page).last();
  await expect(typingArea(questionBox(page, (await cards(page).count()) - 1))).toBeFocused();
  await page.keyboard.type("რომელ წელს?");
  await card.locator("[data-open-answer-space]").getByRole("button", { name: "ერთ ხაზზე (პასუხი: ___)" }).click();
  await expect(card.locator('[data-open-answer-preview="short"]')).toBeVisible();
  const answer = card.locator("[data-open-answer-key] .ProseMirror");
  await answer.click();
  await expect(answer).toBeFocused();
  await page.keyboard.type("1121 წელს");
  await expect(editor(page).locator('[data-save-state="saved"]')).toBeVisible();

  const testId = page.url().split("/").pop();
  await page.goto(`/print/${testId}`);
  await expect(page.locator('[data-print-ready="true"]:visible')).toBeVisible({ timeout: 30_000 });
  const block = page.locator(".sheet:visible [data-print-block]").filter({ hasText: "რომელ წელს?" });
  await expect(block.locator(".print-answer-line")).toBeVisible();
  await expect(block).not.toContainText("1121 წელს");

  await page.goto(`/print/${testId}?version=key`);
  await expect(page.locator('[data-print-ready="true"]:visible')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".sheet:visible [data-print-block]").filter({ hasText: "რომელ წელს?" }).locator(".print-key-answer")).toHaveText("1121 წელს");
});

/** Hidden for the teacher trial: the menu offers the short list only. */
test("the add menu leaves out the hidden question types", async ({ page }) => {
  await openSampleCopy(page, "english");
  for (const type of ["short-answer", "section", "listening", "transformation", "word-formation", "speaking"]) {
    await expect(editor(page).locator(`[data-add-type="${type}"]`), type).toHaveCount(0);
  }
  for (const type of ["open-answer", "crossword", "word-search", "odd-one-out", "picture-match"]) {
    await expect(editor(page).locator(`[data-add-type="${type}"]`), type).toHaveCount(1);
  }
});
