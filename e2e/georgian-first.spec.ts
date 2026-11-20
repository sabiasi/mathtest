import { expect, test, type Page } from "@playwright/test";
import { boxContent, cards, editor, openSampleCopy, questionBox, toolbar, typingArea } from "./helpers";

// A fresh browser = a new teacher or a guest: nothing saved yet, Georgian interface.
async function newQuestion(page: Page) {
  await editor(page).locator('[data-add-type="open-answer"]').click();
  const box = questionBox(page, (await cards(page).count()) - 1);
  await expect(typingArea(box)).toBeFocused();
  return box;
}
const styles = (page: Page) => toolbar(page).locator("[data-toolbar-styles] button");

test("physics units are Georgian from the start, and a Latin choice is remembered", async ({ page }) => {
  await openSampleCopy(page, "physics");
  await newQuestion(page);
  await toolbar(page).getByRole("tab", { name: "ერთეულები" }).click();
  await expect(styles(page).first()).toHaveText("ქართული (მ/წმ)");
  await expect(styles(page).first()).toHaveAttribute("aria-pressed", "true");
  await expect(toolbar(page).locator('[role="tabpanel"] button[data-key*="წმ"]').first()).toBeVisible();
  await expect(toolbar(page).locator('[role="tabpanel"] button[data-key="m:\\mathrm{m/s}"]')).toHaveCount(0);
  // The teacher prefers Latin: kept after a reload.
  await styles(page).nth(1).click();
  await page.reload();
  await expect(editor(page)).toBeVisible();
  await newQuestion(page);
  await toolbar(page).getByRole("tab", { name: "ერთეულები" }).click();
  await expect(styles(page).nth(1)).toHaveAttribute("aria-pressed", "true");
});

test("biology units and geography coordinates start in Georgian", async ({ page }) => {
  await openSampleCopy(page, "biology");
  await newQuestion(page);
  await toolbar(page).getByRole("tab", { name: "ბიოლოგია" }).click();
  await expect(styles(page).first()).toHaveText("მკმ");
  await expect(styles(page).first()).toHaveAttribute("aria-pressed", "true");

  await openSampleCopy(page, "geography");
  const box = await newQuestion(page);
  const tool = toolbar(page).locator("[data-coordinate-tool]");
  await expect(tool.locator("button").first()).toHaveText("ჩ.");
  await tool.locator("input").nth(0).fill("41");
  await tool.locator("input").nth(2).fill("44");
  await typingArea(box).click();
  await tool.locator("[data-coordinate-insert]").first().click();
  expect(JSON.parse(await boxContent(box)).text).toBe("41° ჩ. გ., 44° აღმ. გრძ.");
});

test("the English interface keeps Latin units first", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mathtest:language", "en"));
  await openSampleCopy(page, "physics");
  await newQuestion(page);
  await toolbar(page).getByRole("tab", { name: "Units" }).click();
  await expect(styles(page).first()).toHaveText("Latin (m/s)");
  await expect(styles(page).first()).toHaveAttribute("aria-pressed", "true");
});
