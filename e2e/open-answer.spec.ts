import { expect, test } from "@playwright/test";
import { cards, editor, openSampleCopy } from "./helpers";

/** Open answers: the teacher chooses ruled lines or blank space (mathematics starts blank). */
test("an open answer can print lines or blank space", async ({ page }) => {
  await openSampleCopy(page, "math");
  const card = cards(page).filter({ has: page.locator("[data-open-answer-space]") }).first();
  const choice = card.locator("[data-open-answer-space]");
  await expect(choice).toHaveAttribute("data-open-answer-space", "blank");
  await expect(card.locator('[data-open-answer-preview="blank"]')).toBeVisible();

  await choice.getByRole("button", { name: "ხაზებით" }).click();
  await expect(choice).toHaveAttribute("data-open-answer-space", "lines");
  await expect(card.locator('[data-open-answer-preview="lines"]')).toBeVisible();
  await expect(editor(page).locator('[data-save-state="saved"]')).toBeVisible();

  // On paper: ruled lines now (the sample's other open answers stay blank).
  const id = page.url().split("/").pop();
  await page.goto(`/print/${id}`);
  await expect(page.locator('[data-print-ready="true"]:visible')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".sheet:visible .print-line:not(.print-line-blank)").first()).toBeVisible();
});
