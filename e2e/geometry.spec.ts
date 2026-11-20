import { expect, test } from "@playwright/test";
import { cards, collectErrors, editor, openSampleCopy } from "./helpers";

/**
 * The "Geometric figure" tool (mathematics): insert without typing, edit,
 * cancel, save + reload, print; and the older diagrams still draw.
 */
test("a geometric figure: insert, edit, cancel, reload, print", async ({ page }) => {
  const errors = collectErrors(page);
  await openSampleCopy(page, "math");
  const card = cards(page).first();
  const figure = card.locator("svg[data-geometry-figure]");
  const dialog = page.locator("[data-diagram-dialog=geometry]");
  await expect(figure).toHaveCount(0);

  // Insert the default figure: two clicks, no typing.
  await card.locator('[data-new-diagram="geometry"]').click();
  await expect(dialog.locator("[data-geometry-preview] svg")).toHaveAttribute("data-geometry-figure", "triangle");
  await expect(dialog.locator("[data-geometry-shape]")).toHaveCount(10);
  await dialog.locator("[data-diagram-save]").click();
  await expect(figure).toHaveAttribute("data-geometry-figure", "triangle");
  await expect(figure.locator("text")).toHaveText(["A", "B", "C"]);

  // Cancel throws the changes away.
  await card.locator("[data-edit-diagram]").click();
  await dialog.locator('[data-geometry-shape="circle"]').click();
  await expect(dialog.locator("[data-geometry-preview] svg")).toHaveAttribute("data-geometry-figure", "circle");
  await dialog.getByRole("button", { name: "გაუქმება" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(figure).toHaveAttribute("data-geometry-figure", "triangle");

  // Edit: a right triangle with side labels, using the keyboard for the choice.
  await card.locator("[data-edit-diagram]").click();
  await dialog.locator('[data-geometry-triangle="right"]').focus();
  await page.keyboard.press("Enter");
  await expect(dialog.locator("[data-geometry-preview] [data-right-angle]")).toHaveCount(1);
  await dialog.locator("[data-geometry-labels]").click();
  await dialog.locator('[data-geometry-side="0"]').fill("5 სმ");
  await dialog.locator('[data-geometry-side="2"]').fill("x");
  await dialog.locator("[data-diagram-save]").click();
  await expect(figure.locator("[data-right-angle]")).toHaveCount(1);
  await expect(figure.locator("text")).toHaveText(["A", "B", "C", "5 სმ", "x"]);

  // Saved in the browser (guest) and still there after a reload.
  await expect(editor(page).locator('[data-save-state="saved"]')).toBeVisible();
  await page.reload();
  const again = cards(page).first().locator("svg[data-geometry-figure]");
  await expect(again.locator("text")).toHaveText(["A", "B", "C", "5 სმ", "x"]);
  // Reopening shows the saved labels straight away.
  await cards(page).first().locator("[data-edit-diagram]").click();
  await expect(dialog.locator('[data-geometry-side="0"]')).toHaveValue("5 სმ");
  await page.keyboard.press("Escape");

  // On paper: inside the sheet, with its labels inside the drawing.
  const id = page.url().split("/").pop();
  await page.goto(`/print/${id}`);
  await expect(page.locator('[data-print-ready="true"]:visible')).toBeVisible({ timeout: 30_000 });
  const printed = page.locator('.sheet:visible svg[data-geometry-figure="triangle"]').first();
  await expect(printed).toBeVisible();
  const inside = await printed.evaluate((svg) => {
    const box = svg.getBoundingClientRect();
    const sheet = svg.closest(".sheet")!.getBoundingClientRect();
    const texts = [...svg.querySelectorAll("text")].map((text) => text.getBoundingClientRect());
    return {
      onSheet: box.left >= sheet.left && box.right <= sheet.right && box.width > 40,
      labels: texts.every((r) => r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5),
    };
  });
  expect(inside).toEqual({ onSheet: true, labels: true });
  // The sample's own circle (made with the same tool) prints round.
  const circle = page.locator('.sheet:visible svg[data-geometry-figure="circle"] circle').first();
  const round = await circle.evaluate((el) => el.getBoundingClientRect());
  expect(Math.abs(round.width - round.height)).toBeLessThan(0.5);
  expect(errors).toEqual([]);
});

test("older diagrams still print (physics circuit and forces, chemistry structure)", async ({ page }) => {
  for (const [subject, count] of [["physics", 2], ["chemistry", 1]] as const) {
    await page.goto(`/print/sample-${subject}`);
    await expect(page.locator('[data-print-ready="true"]:visible')).toBeVisible({ timeout: 30_000 });
    const drawn = await page.locator(".sheet:visible [data-diagram-kind]").evaluateAll((els) => els.filter((el) => el.querySelector("svg line, svg path, svg rect") && el.getBoundingClientRect().height > 20).length);
    expect(drawn).toBeGreaterThanOrEqual(count);
  }
});
