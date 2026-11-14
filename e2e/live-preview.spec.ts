import { expect, test, type Locator, type Page } from "@playwright/test";
import { cards, editor, openSampleCopy, questionBox, scrollY, SUBJECTS, typingArea } from "./helpers";

// "ქაღალდზე ნახვა": the whole test on paper beside the editor, drawn by the print page's own code.
const WIDE = { width: 1440, height: 900 };

const view = (page: Page) => editor(page).locator("[data-live-preview]");
const ready = (page: Page) => editor(page).locator('[data-live-preview][data-live-ready="true"]');
const sheets = (page: Page) => view(page).locator(".sheet");

async function openView(page: Page) {
  await editor(page).locator("[data-paper-view-toggle]").click();
  await expect(ready(page)).toBeVisible();
}

/** What a printed block says and contains, for comparing the live view with the print page. */
async function describe(block: Locator) {
  return block.evaluate((el) => ({
    text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
    math: el.querySelectorAll(".ML__latex").length,
    images: el.querySelectorAll("img").length,
    svgs: el.querySelectorAll("svg").length,
  }));
}
async function blocksIn(root: Locator) {
  const result: Record<string, Awaited<ReturnType<typeof describe>>> = {};
  for (const block of await root.locator("[data-print-block]").all()) result[(await block.getAttribute("data-print-block"))!] = await describe(block);
  return result;
}

for (const subject of SUBJECTS) {
  test(`${subject}: the paper view shows the same pages as the print page (student and key)`, async ({ page }) => {
    await page.setViewportSize(WIDE);
    await openSampleCopy(page, subject);
    const id = page.url().split("/editor/")[1];
    await openView(page);
    const live = { student: await blocksIn(sheets(page)), key: {} as Record<string, unknown>, pages: { student: await sheets(page).count(), key: 0 } };
    await view(page).getByRole("button", { name: "პასუხები" }).click();
    await expect(editor(page).locator('[data-live-version="key"][data-live-ready="true"]')).toBeVisible();
    live.key = await blocksIn(sheets(page));
    live.pages.key = await sheets(page).count();
    for (const version of ["student", "key"] as const) {
      await page.goto(`/print/${id}${version === "key" ? "?version=key" : ""}`);
      await expect(page.locator('[data-print-ready="true"]')).toBeVisible();
      expect(await page.locator(".sheet").count(), `${version}: pages`).toBe(live.pages[version]);
      expect(live[version], version).toEqual(await blocksIn(page.locator(".sheet")));
    }
  });
}

test("split screen: what is typed appears on the paper, the edited question is shown and outlined", async ({ page }) => {
  await page.setViewportSize(WIDE);
  await openSampleCopy(page, "math");
  await openView(page);
  await expect(page.locator('[data-split-view="on"]')).toBeVisible();
  // Side by side: the editor on the left, the paper on the right.
  const [left, right] = await Promise.all([cards(page).first().boundingBox(), view(page).boundingBox()]);
  expect(left!.x + left!.width).toBeLessThanOrEqual(right!.x);

  // A new question: the paper scrolls to it and outlines it.
  await editor(page).locator('[data-add-type="short-answer"]').click();
  const last = (await cards(page).count()) - 1;
  const area = typingArea(questionBox(page, last));
  await expect(area).toBeFocused();
  const y = await scrollY(page);
  await page.keyboard.type("ახალი კითხვა ქაღალდზე");
  const outlined = sheets(page).locator("[data-editing]");
  await expect(outlined).toContainText("ახალი კითხვა ქაღალდზე");
  await expect(outlined).toBeInViewport();
  await expect(area).toBeFocused();
  expect(await scrollY(page), "the editor never moves").toBe(y);

  // Another question: the outline follows.
  await typingArea(questionBox(page, 0)).click();
  const firstId = await cards(page).first().getAttribute("data-question-id");
  await expect(sheets(page).locator("[data-editing]")).toHaveAttribute("data-print-block", firstId!);
  await expect(sheets(page).locator("[data-editing]")).toBeInViewport();

  // Closing gives the editor its full width back; the text is still there.
  await view(page).getByRole("button", { name: "ქაღალდის ხედის დახურვა" }).click();
  await expect(page.locator('[data-split-view="off"]')).toBeAttached();
  await expect(typingArea(questionBox(page, last))).toContainText("ახალი კითხვა ქაღალდზე");
});

test("small screens: the paper covers the editor and closes again", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await openSampleCopy(page, "physics");
  await openView(page);
  await expect(editor(page).locator('[data-live-preview="full"]')).toBeVisible();
  const box = await sheets(page).first().boundingBox();
  expect(box!.width).toBeLessThanOrEqual(800);
  await view(page).getByRole("button", { name: "ქაღალდის ხედის დახურვა" }).click();
  await expect(view(page)).toHaveCount(0);
});

test("the paper stays white in dark mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize(WIDE);
  await openSampleCopy(page, "chemistry");
  await openView(page);
  expect(await sheets(page).first().evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 255, 255)");
});
