import { expect, test, type Browser, type Page } from "@playwright/test";
import { accountsConfigured, becomeFree, guestWithCloud, newCloud, signIn, teacherWithTest, type FakeCloud } from "./account";
import { editor } from "./helpers";

/**
 * Sharing and co-editing (stage 4) with made-up teachers, each in their own
 * browser window, all talking to ONE pretend cloud (see e2e/account.ts).
 * The database rules themselves are tested in src/lib/sharing/sharingSql.test.ts.
 */
test.skip(!accountsConfigured, "Account UI requires a public Supabase URL configured at build time");

const titleBox = (page: Page) => editor(page).locator("[data-title-input]");
const ownersTest = (cloud: FakeCloud, uid: string) => cloud.tests.find((row) => row.user_id === uid) as { id: string; version: number; data: { title: string } };

/** A second (third…) person: their own browser window, signed in to the same pretend cloud. */
async function colleague(browser: Browser, cloud: FakeCloud, name: string, subjects = ["math"]) {
  const page = await (await browser.newContext({ locale: "ka-GE", viewport: { width: 1280, height: 800 } })).newPage();
  const teacher = await signIn(page, { cloud, name, subjects });
  return { page, ...teacher };
}

async function shareWith(page: Page, email: string, role: "view" | "edit") {
  await editor(page).locator("[data-share-button]").click();
  const dialog = page.locator("[data-share-dialog]");
  await expect(dialog.locator("[data-share-email]")).toBeVisible({ timeout: 15_000 });
  await dialog.locator("[data-share-email]").fill(email);
  await dialog.locator("[data-share-role]").selectOption(role);
  await dialog.locator("[data-share-add]").click();
  await expect(dialog.locator(`[data-share-person="${email}"]`)).toBeVisible();
  return dialog;
}

test("view: the colleague finds the test under 'Shared with me', can't change it, makes an own copy, and can leave", async ({ page, browser }) => {
  const cloud = newCloud();
  const owner = await teacherWithTest(page, "math", { cloud, name: "ნინო ავტორი" });
  const other = await colleague(browser, cloud, "გიორგი კოლეგა");

  // Wrong addresses are explained in the window; nothing is shared.
  await editor(page).locator("[data-share-button]").click();
  const dialog = page.locator("[data-share-dialog]");
  await dialog.locator("[data-share-email]").fill("not-an-email");
  await dialog.locator("[data-share-add]").click();
  await expect(dialog.locator("[data-share-problem]")).toContainText("არასწორია");
  await dialog.locator("[data-share-email]").fill(owner.email);
  await dialog.locator("[data-share-add]").click();
  await expect(dialog.locator("[data-share-problem]")).toContainText("თქვენი ელფოსტაა");
  expect(cloud.shares).toHaveLength(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0); // closed (its fading overlay would catch the next click)

  await shareWith(page, other.email, "view");
  expect(cloud.shares).toMatchObject([{ owner_id: owner.uid, email: other.email, role: "view" }]);

  // The colleague: a separate list on My tests (their own list stays empty).
  await other.page.goto("/tests");
  const row = other.page.locator("[data-shared-with-me] [data-shared-test]");
  await expect(row).toHaveCount(1);
  await expect(row).toHaveAttribute("data-shared-role", "view");
  await expect(row).toContainText("ნინო ავტორი");
  await expect(other.page.locator("[data-test-card]")).toHaveCount(0);

  // Opening it: readable, with a banner, but nothing can be changed.
  await row.locator("[data-shared-open]").click();
  await expect(editor(other.page).locator('[data-shared-banner="view"]')).toContainText("ნინო ავტორი");
  await expect(editor(other.page).locator("[data-test-header]").locator("xpath=ancestor::*[@inert]")).toHaveCount(1);
  await expect(editor(other.page).locator("[data-share-button]")).toHaveCount(0);
  // …and it prints.
  await other.page.goto(`/print/shared~${owner.uid}~${ownersTest(cloud, owner.uid).id}`);
  await expect(other.page.locator('[data-print-ready="true"]')).toBeVisible();
  await expect(other.page.locator(".sheet").first()).toBeVisible();

  // "Make my own copy": a new test of the colleague's own; the owner's test is untouched.
  await other.page.goto("/tests");
  await other.page.locator("[data-shared-copy]").click();
  await other.page.waitForURL((url) => url.pathname.startsWith("/editor/") && !url.pathname.includes("shared~"));
  await expect(editor(other.page).locator("[data-shared-banner]")).toHaveCount(0);
  await expect.poll(() => cloud.tests.filter((item) => item.user_id === other.uid).length).toBe(1);
  expect(ownersTest(cloud, owner.uid).version).toBe(1);

  // Leaving: gone from the colleague's list, the owner's test stays.
  await other.page.goto("/tests");
  await other.page.locator("[data-shared-leave]").click();
  await other.page.locator("[data-confirm-dialog] button").last().click();
  await expect(other.page.locator("[data-shared-with-me]")).toHaveCount(0);
  expect(cloud.shares).toHaveLength(0);
  expect(cloud.tests.filter((item) => item.user_id === owner.uid)).toHaveLength(1);
});

test("edit together: each sees who else is there, a save is announced, and nobody is silently overwritten", async ({ page, browser }) => {
  const cloud = newCloud();
  const owner = await teacherWithTest(page, "math", { cloud, name: "ნინო ავტორი" });
  const other = await colleague(browser, cloud, "გიორგი კოლეგა");
  await shareWith(page, other.email, "edit");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-share-dialog]")).toHaveCount(0);

  const key = `shared~${owner.uid}~${ownersTest(cloud, owner.uid).id}`;
  await other.page.goto(`/editor/${key}`);
  await expect(editor(other.page).locator('[data-shared-banner="edit"]')).toBeVisible();

  // Presence: both see the other person's badge.
  await expect(editor(page).locator('[data-co-editor="გიორგი კოლეგა"]')).toBeVisible();
  await expect(editor(other.page).locator('[data-co-editor="ნინო ავტორი"]')).toBeVisible();

  // The colleague changes the title: it is saved into the OWNER's test (version 2)…
  await titleBox(other.page).fill("კოლეგის სათაური");
  await expect.poll(() => ownersTest(cloud, owner.uid).data.title).toBe("კოლეგის სათაური");
  expect(ownersTest(cloud, owner.uid).version).toBe(2);
  // …and the owner is told at once.
  await expect(editor(page).locator("[data-changed-notice]")).toContainText("გიორგი კოლეგა");

  // The owner types anyway (still looking at the old version): the save is refused and the owner chooses.
  await titleBox(page).fill("ავტორის სათაური");
  const conflict = page.locator("[data-conflict-dialog]");
  await expect(conflict).toBeVisible();
  expect(ownersTest(cloud, owner.uid).data.title).toBe("კოლეგის სათაური"); // nothing was overwritten
  await conflict.locator("[data-conflict-mine]").click();
  await expect.poll(() => ownersTest(cloud, owner.uid).data.title).toBe("ავტორის სათაური");
  await expect(conflict).toHaveCount(0);

  // Now the colleague is behind. Their next save is refused too; "load the new version" shows the owner's title.
  await titleBox(other.page).fill("კიდევ ერთი");
  const theirs = other.page.locator("[data-conflict-dialog]");
  await expect(theirs).toBeVisible();
  await theirs.locator("[data-conflict-theirs]").click();
  await expect(titleBox(other.page)).toHaveValue("ავტორის სათაური");
  expect(ownersTest(cloud, owner.uid).data.title).toBe("ავტორის სათაური");

  // After that, saving works normally again.
  await titleBox(other.page).fill("ერთად დაწერილი");
  await expect.poll(() => ownersTest(cloud, owner.uid).data.title).toBe("ერთად დაწერილი");
  await expect(other.page.locator("[data-conflict-dialog]")).toHaveCount(0);

  // The owner's "load the new version" button brings it in without a conflict.
  await editor(page).locator("[data-changed-reload]").click();
  await expect(titleBox(page)).toHaveValue("ერთად დაწერილი");

  // When the colleague closes the test, their badge goes away.
  await other.page.goto("/tests");
  await expect(editor(page).locator("[data-co-editors]")).toHaveCount(0);
});

test("the teaching-subject rule: 'edit' in a subject the colleague doesn't teach is read-only", async ({ page, browser }) => {
  const cloud = newCloud();
  const owner = await teacherWithTest(page, "math", { cloud });
  const other = await colleague(browser, cloud, "ფიზიკის მასწავლებელი", ["physics"]);
  await shareWith(page, other.email, "edit");
  await other.page.goto("/tests");
  await expect(other.page.locator("[data-shared-test]")).toContainText("მხოლოდ ნახვა");
  await other.page.goto(`/editor/shared~${owner.uid}~${ownersTest(cloud, owner.uid).id}`);
  await expect(editor(other.page).locator('[data-shared-banner="view"]')).toContainText("ასწავლით");
});

test("view-only link: opens without an account, prints, and stops working when switched off", async ({ page, browser }) => {
  const cloud = newCloud();
  const owner = await teacherWithTest(page, "math", { cloud, name: "ნინო ავტორი" });
  await editor(page).locator("[data-share-button]").click();
  const dialog = page.locator("[data-share-dialog]");
  await dialog.locator("[data-share-link-create]").click();
  const address = await dialog.locator("[data-share-link]").inputValue();
  expect(address).toMatch(/\/shared\/[0-9a-f]{64}$/);
  expect(cloud.links).toMatchObject([{ owner_id: owner.uid }]);

  // Someone with no account at all.
  const guest = await (await browser.newContext({ locale: "ka-GE" })).newPage();
  await guestWithCloud(guest, cloud);
  await guest.goto(address);
  await expect(guest.locator("[data-shared-link]")).toContainText("ნინო ავტორი");
  await expect(guest.locator('[data-print-ready="true"]')).toBeVisible();
  await expect(guest.locator(".sheet").first()).toBeVisible();
  await expect(guest.locator('a[href^="/editor/"]')).toHaveCount(0); // nothing leads to an editor

  // A made-up address shows a friendly page, not someone's test.
  await guest.goto(`/shared/${"0".repeat(64)}`);
  await expect(guest.getByText("ბმული აღარ მუშაობს")).toBeVisible();

  // The owner switches the link off: the same address stops working.
  await dialog.locator("[data-share-link-off]").click();
  await page.locator("[data-confirm-dialog] button").last().click();
  await expect(dialog.locator("[data-share-link-create]")).toBeVisible();
  expect(cloud.links).toHaveLength(0);
  await guest.goto(address);
  await expect(guest.getByText("ბმული აღარ მუშაობს")).toBeVisible();
});

test("Free: 'Share' offers Premium; shares made earlier are kept (paused) and can still be stopped", async ({ page, browser }) => {
  const cloud = newCloud();
  const owner = await teacherWithTest(page, "math", { cloud });
  const other = await colleague(browser, cloud, "გიორგი კოლეგა");
  await shareWith(page, other.email, "view");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-share-dialog]")).toHaveCount(0);

  // Premium ends (the trial runs out). The database stops the sharing; nothing is deleted.
  await becomeFree(page);
  cloud.paused.add(owner.uid);
  await page.reload();
  await expect(editor(page)).toBeVisible();
  await other.page.goto("/tests");
  await expect(other.page.locator("[data-shared-with-me]")).toHaveCount(0);

  // The owner can open the window (the test is shared) but only to stop sharing.
  await editor(page).locator("[data-share-button]").click();
  const dialog = page.locator("[data-share-dialog]");
  await expect(dialog.locator("[data-share-paused]")).toBeVisible();
  await expect(dialog.locator("[data-share-add]")).toHaveCount(0);
  await dialog.locator("[data-share-remove]").click();
  await expect(dialog.locator("[data-share-person]")).toHaveCount(0);
  expect(cloud.shares).toHaveLength(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0); // closed (its fading overlay would catch the next click)

  // With nothing shared any more, "Share" explains Premium.
  await editor(page).locator("[data-share-button]").click();
  await expect(page.locator("[data-upgrade-dialog]")).toContainText("გაზიარება");
});
