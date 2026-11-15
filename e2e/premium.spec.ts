import { expect, test } from "@playwright/test";
import { accountsConfigured, becomeFree, signIn, teacherWithTest } from "./account";
import { cards, editor } from "./helpers";

/**
 * Premium features (stage 4) with a made-up signed-in teacher. A new sandbox
 * account starts with the Premium trial; "skipDays 15" ends it (→ Free).
 */
test.skip(!accountsConfigured, "Account UI requires a public Supabase URL configured at build time");

/** A 2 × 1 red PNG (a "logo" twice as wide as it is tall). */
const LOGO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEElEQVR4nGP8z8Dwn4GBgQEADAEB/6k8n0cAAAAASUVORK5CYII=", "base64");

test.describe("custom paper header", () => {
  test("Premium: logo, school and extra line are saved and printed at the top of the paper", async ({ page }) => {
    await signIn(page);
    await page.goto("/settings");
    const settings = page.locator('[data-letterhead-settings="open"]');
    await expect(settings).toBeVisible();
    await settings.getByRole("button", { name: "ჩართულია" }).click();
    await settings.locator("[data-letterhead-school]").fill("თბილისის 51-ე საჯარო სკოლა");
    await settings.locator('[data-letterhead-line="0"]').fill("სემესტრული გამოცდა");
    await settings.locator("[data-letterhead-file]").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: LOGO });
    await settings.getByRole("button", { name: "მარჯვნივ" }).click();
    // The small paper in Settings shows it at once.
    const preview = settings.locator("[data-letterhead-preview]");
    await expect(preview.locator('[data-letterhead="right"] img')).toBeVisible();
    await expect(preview).toContainText("სემესტრული გამოცდა");
    await settings.locator("[data-letterhead-save]").click();
    await expect(page.getByText("ფურცლის თავი შენახულია")).toBeVisible();

    // A real paper: the letterhead replaces the plain school line, on every sheet's first page.
    await page.goto("/print/sample-math");
    const sheet = page.locator(".sheet").first();
    await expect(sheet.locator("[data-letterhead]")).toContainText("თბილისის 51-ე საჯარო სკოლა");
    await expect(sheet.locator("[data-letterhead]")).toContainText("სემესტრული გამოცდა");
    const logo = sheet.locator("[data-letterhead] img");
    await expect(logo).toBeVisible();
    const box = await logo.boundingBox();
    expect(box!.width / box!.height).toBeCloseTo(2, 1); // the logo keeps its shape
    await expect(page.locator('[data-print-ready="true"]')).toBeVisible();
  });

  test("Free: the default header prints, a saved header is kept, and the section offers Premium", async ({ page }) => {
    await signIn(page);
    await page.goto("/settings");
    const settings = page.locator('[data-letterhead-settings="open"]');
    await settings.getByRole("button", { name: "ჩართულია" }).click();
    await settings.locator("[data-letterhead-school]").fill("ჩემი სკოლა");
    await settings.locator("[data-letterhead-save]").click();
    await expect(page.getByText("ფურცლის თავი შენახულია")).toBeVisible();

    await becomeFree(page);
    await page.goto("/print/sample-math");
    await expect(page.locator(".sheet").first().locator(".print-title")).toBeVisible();
    await expect(page.locator(".sheet [data-letterhead]")).toHaveCount(0);

    await page.goto("/settings");
    const locked = page.locator('[data-letterhead-settings="locked"]');
    await expect(locked).toContainText("შენახული თავი ადგილზეა");
    await locked.locator("[data-letterhead-unlock]").click();
    await expect(page.locator("[data-upgrade-dialog]")).toBeVisible();
  });
});

test.describe("template library", () => {
  test("Premium: every template can be previewed on paper and opened as one's own test", async ({ page }) => {
    await signIn(page, { subjects: ["math", "chemistry"] });
    await page.goto("/templates");
    await expect(page.locator("[data-template]")).toHaveCount(16);
    await expect(page.locator('[data-template-locked="true"]')).toHaveCount(0);
    await expect(page.locator("[data-templates-note]")).toHaveCount(0);

    // Filter by subject, then look at a Premium-only template as real A4 pages.
    await page.locator('[data-template-subject="chemistry"]').click();
    await expect(page.locator("[data-template]")).toHaveCount(2);
    await page.locator('[data-template="chemistry-9-reactions"] [data-template-preview]').click();
    const dialog = page.locator("[data-template-dialog]");
    await expect(dialog.locator('[data-paper-preview="ready"] .sheet').first()).toBeVisible();
    await expect(dialog.locator(".sheet").first()).toContainText("ქიმიური რეაქციები");
    await dialog.locator("[data-template-use-previewed]").click();
    await page.waitForURL((url) => url.pathname.startsWith("/editor/"));
    await expect(editor(page)).toBeVisible();
    await expect(cards(page)).toHaveCount(6);
  });

  test("Free: the plan's 5 templates open; the others explain Premium and the server refuses them", async ({ page }) => {
    await signIn(page, { subjects: ["math"] });
    await becomeFree(page);
    await page.goto("/templates");
    await expect(page.locator("[data-templates-note]")).toContainText("5");
    await expect(page.locator('[data-template-locked="false"]')).toHaveCount(5);
    await expect(page.locator('[data-template-locked="true"]')).toHaveCount(11);

    await page.locator('[data-template="math-9-quadratic"] [data-template-use]').click();
    await expect(page.locator("[data-upgrade-dialog]")).toBeVisible();
    await page.keyboard.press("Escape");
    // Asking the server directly doesn't help either.
    expect((await page.request.get("/api/templates/math-9-quadratic")).status()).toBe(403);
    expect((await page.request.get("/api/templates/no-such")).status()).toBe(404);
    const free = await page.request.get("/api/templates/math-7-linear");
    expect(free.status()).toBe(200);
    expect((await free.json()).test.questions).toHaveLength(6);

    await page.locator('[data-template="math-7-linear"] [data-template-use]').click();
    await page.waitForURL((url) => url.pathname.startsWith("/editor/"));
    await expect(cards(page)).toHaveCount(6);
  });
});

test.describe("question bank", () => {
  /** A question card's "⋯" menu → "Save to my bank". */
  async function saveToBank(page: import("@playwright/test").Page, n: number) {
    await cards(page).nth(n).locator("[data-question-menu]").click();
    await page.locator("[data-save-to-bank]").click();
    await expect(page.locator("[data-save-to-bank]")).toHaveCount(0); // the menu has closed
  }

  test("Premium: save questions, find them in the bank, see one on paper, tag it, insert copies into a test", async ({ page }) => {
    await teacherWithTest(page);
    const before = await cards(page).count();
    await saveToBank(page, 0);
    await expect(page.getByText("კითხვა შენახულია ბანკში")).toHaveCount(1);
    await saveToBank(page, 1);
    await expect(page.getByText("კითხვა შენახულია ბანკში")).toHaveCount(2);

    // To the bank without reloading (the header link, then the button on My tests).
    await page.locator('header a[href="/tests"]').first().click();
    await page.locator("[data-bank-link]").click();
    await page.waitForURL("**/bank");
    const items = page.locator("[data-bank-list] [data-bank-item]");
    await expect(items).toHaveCount(2);
    await expect(items.first().locator("[data-bank-text]")).not.toBeEmpty();

    // The real print rendering, without the test's header; the key shows the answer.
    await items.first().locator("[data-bank-preview]").click();
    const dialog = page.locator("[data-bank-dialog]");
    await expect(dialog.locator('[data-paper-preview="ready"] .sheet [data-print-block]').first()).toBeVisible();
    await expect(dialog.locator(".sheet .print-header")).toBeHidden();
    await dialog.getByRole("button", { name: "პასუხები" }).click();
    await expect(dialog.locator('[data-paper-preview="ready"] .sheet').first()).toBeVisible();
    await page.keyboard.press("Escape");

    // Tags, then the filters.
    await items.first().locator("[data-bank-edit-tags]").click();
    await page.locator("[data-bank-tags-input]").fill("ალგებრა, საკონტროლო, ალგებრა");
    await page.locator("[data-bank-tags-save]").click();
    await expect(items.first().locator("[data-bank-tag-chip]")).toHaveText(["ალგებრა", "საკონტროლო"]);
    await page.locator("[data-bank-tag]").selectOption("საკონტროლო");
    await expect(items).toHaveCount(1);
    await page.locator("[data-bank-tag]").selectOption("");
    await page.locator("[data-bank-search]").fill("ასეთი სიტყვა არ არის");
    await expect(items).toHaveCount(0);
    await page.locator("[data-bank-search]").fill("");
    await expect(items).toHaveCount(2);

    // Back in the editor: insert both as copies at the end of the test.
    await page.goBack();
    await page.goBack();
    await expect(editor(page)).toBeVisible();
    await editor(page).locator("[data-bank-open]").click();
    const insert = page.locator("[data-bank-insert-dialog]");
    await expect(insert.locator("[data-bank-item]")).toHaveCount(2);
    await expect(insert.locator("[data-bank-insert]")).toBeDisabled();
    await insert.locator("[data-bank-pick]").first().check();
    await insert.locator("[data-bank-pick]").nth(1).check();
    await insert.locator("[data-bank-insert]").click();
    await expect(cards(page)).toHaveCount(before + 2);

    // Deleting from the bank asks first, and leaves the test alone.
    await page.locator('header a[href="/tests"]').first().click();
    await page.locator("[data-bank-link]").click();
    await items.first().locator("[data-bank-delete]").click();
    await page.getByRole("alertdialog").getByRole("button", { name: "ბანკიდან წაშლა" }).click();
    await expect(items).toHaveCount(1);
  });

  test("Free: saving and inserting explain Premium; the bank page says the saved questions are kept", async ({ page }) => {
    await teacherWithTest(page);
    await saveToBank(page, 0);
    await expect(page.getByText("კითხვა შენახულია ბანკში")).toBeVisible();
    await becomeFree(page);
    await page.locator('header a[href="/tests"]').first().click();
    await page.locator("[data-bank-link]").click();
    await expect(page.locator("[data-bank-item]")).toHaveCount(1);
    // The plan is asked again when the tab is looked at; here: reload the plan by opening the page anew.
    await page.reload();
    await expect(page.locator("[data-bank-locked]")).toBeVisible();
    await page.locator("[data-bank-unlock]").click();
    await expect(page.locator("[data-upgrade-dialog]")).toBeVisible();
  });

  test("guests are told the bank needs an account", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/bank");
    await expect(page.getByRole("link", { name: "ანგარიშის შექმნა" })).toBeVisible();
    await context.close();
  });
});

test("guests see the library and can use a free template as their trial test", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/templates");
  await expect(page.locator("[data-template]")).toHaveCount(16);
  expect((await page.request.get("/api/templates/physics-9-electric")).status()).toBe(403);
  await page.locator('[data-template="physics-8-motion"] [data-template-use]').click();
  await page.waitForURL((url) => url.pathname.startsWith("/editor/"));
  await expect(cards(page)).toHaveCount(6);
  await context.close();
});
