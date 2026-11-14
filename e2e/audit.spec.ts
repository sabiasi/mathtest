import { expect, test } from "@playwright/test";
import { cards, collectErrors, editor, openSampleCopy, questionBox, SUBJECTS, typingArea } from "./helpers";

const noSidewaysScroll = (page: import("@playwright/test").Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

for (const theme of ["light", "dark"] as const) {
  test(`public pages load without errors (${theme})`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.addInitScript((value) => localStorage.setItem("mathtest:theme", value), theme);
    for (const path of ["/", "/about", "/pricing", "/signin", "/signup", "/forgot-password", "/tests"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.locator("h1").first(), path).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.classList.contains("dark")), path).toBe(theme === "dark");
      expect(await noSidewaysScroll(page), `${path}: sideways scroll`).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

for (const subject of SUBJECTS) {
  test(`${subject}: every "add question" button works, and the test still prints`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/tests");
    await page.locator("[data-show-all-subjects]").click();
    await page.locator(`[data-view="${subject}"]`).click();
    await page.locator(`[data-create-in="${subject}"]`).click();
    await expect(editor(page)).toBeVisible();
    const add = editor(page).locator("[data-add-type]");
    const count = await add.count();
    expect(count).toBeGreaterThan(5);
    for (let i = 0; i < count; i++) {
      await add.nth(i).click();
      await expect(cards(page)).toHaveCount(i + 1);
    }
    // Type into the first box, wait for autosave, reload: everything is still there.
    await typingArea(questionBox(page, 0)).click();
    await page.keyboard.type("შემოწმება 123");
    await expect(editor(page).locator('[data-save-state="saved"]')).toBeVisible();
    await page.reload();
    await expect(cards(page)).toHaveCount(count);
    await expect(typingArea(questionBox(page, 0))).toContainText("შემოწმება 123");
    // The print page copes with empty questions of every type (student + key).
    const id = page.url().split("/").pop();
    for (const version of ["student", "key"]) {
      await page.goto(`/print/${id}?version=${version}`);
      await expect(page.locator('[data-print-ready="true"]:visible')).toBeVisible({ timeout: 30_000 });
    }
    expect(errors).toEqual([]);
  });

  test(`${subject}: the sample prints (student, key, all variants) and is read-only`, async ({ page }) => {
    const errors = collectErrors(page);
    for (const query of ["version=student", "version=key", "version=key&variant=all"]) {
      await page.goto(`/print/sample-${subject}?${query}`);
      await expect(page.locator('[data-print-ready="true"]:visible')).toBeVisible({ timeout: 30_000 });
      expect(await page.locator(".sheet:visible").count()).toBeGreaterThan(0);
      // No warnings box: the sample's answer key is complete.
      await expect(page.locator(".bg-warning-soft:visible ul li")).toHaveCount(0);
      // Paper is white with black text, in any theme.
      const paper = await page.locator(".sheet:visible").first().evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(paper).toBe("rgb(255, 255, 255)");
    }
    await page.goto(`/editor/sample-${subject}`);
    await expect(page.locator("[data-sample-banner]:visible")).toBeVisible();
    expect(await page.locator("[data-sample-banner]:visible + div").evaluate((el) => (el as HTMLElement).inert)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("deleting a question can be undone, and drag-and-drop by keyboard reorders", async ({ page }) => {
  await openSampleCopy(page, "math");
  const first = await questionBox(page, 0).innerText();
  const second = await questionBox(page, 1).innerText();
  const count = await cards(page).count();
  // Keyboard drag: focus the handle, Space, ArrowDown, Space.
  const handle = cards(page).nth(0).locator("button").first();
  await handle.focus();
  // dnd-kit measures between the keys: give it a moment each time.
  for (const key of ["Space", "ArrowDown", "Space"]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(300);
  }
  await expect.poll(() => questionBox(page, 0).innerText()).toBe(second);
  expect(await questionBox(page, 1).innerText()).toBe(first);
  // Delete the first card, then Undo from the toast.
  await cards(page).nth(0).getByRole("button", { name: "კითხვის წაშლა" }).click();
  await page.getByRole("alertdialog").getByRole("button").last().click();
  await expect(cards(page)).toHaveCount(count - 1);
  await page.getByRole("button", { name: "დაბრუნება" }).click();
  await expect(cards(page)).toHaveCount(count);
  expect(await questionBox(page, 0).innerText()).toBe(second);
});

for (const size of [
  { name: "tablet", width: 820, height: 1180 },
  { name: "phone", width: 390, height: 800 },
]) {
  test(`${size.name}: editor, my tests and print fit the screen`, async ({ page }) => {
    await page.setViewportSize(size);
    await openSampleCopy(page, "physics");
    expect(await noSidewaysScroll(page), "editor").toBe(true);
    await typingArea(questionBox(page, 3)).click();
    await page.waitForTimeout(400);
    expect(await noSidewaysScroll(page), "editor with the toolbar open").toBe(true);
    await page.goto("/tests");
    await expect(page.locator("[data-subject-nav]:visible")).toBeVisible();
    expect(await noSidewaysScroll(page), "my tests").toBe(true);
    await page.goto("/print/sample-biology");
    await expect(page.locator('[data-print-ready="true"]:visible')).toBeVisible({ timeout: 30_000 });
    expect(await noSidewaysScroll(page), "print").toBe(true);
  });
}
