/** A guest whose saved tests can't be read: nothing is overwritten, and the page says what to do. */
import { expect, test } from "@playwright/test";

const KEY = "mathtest:tests:v1";
const BROKEN = '[{"id":"a","title":"ნახევრად შენახ';

test("damaged browser storage is explained, kept, and can be put aside", async ({ page }) => {
  // Only the first page load plants the broken value (the reload below must not put it back).
  await page.addInitScript(([key, value]) => {
    if (!sessionStorage.getItem("planted")) {
      sessionStorage.setItem("planted", "1");
      localStorage.setItem(key, value);
    }
  }, [KEY, BROKEN]);
  await page.goto("/tests");

  const startEmpty = page.locator("[data-start-empty]");
  await expect(startEmpty).toBeVisible();
  // Looking at the page changed nothing.
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(BROKEN);

  await startEmpty.click();
  await expect(startEmpty).toBeHidden();
  const stored = await page.evaluate((key) => ({ tests: localStorage.getItem(key), aside: localStorage.getItem("mathtest:tests:damaged:v1") }), KEY);
  expect(stored).toEqual({ tests: null, aside: BROKEN });

  // The old data is still there after a reload, and the list works again.
  await page.reload();
  await expect(startEmpty).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("mathtest:tests:damaged:v1"))).toBe(BROKEN);
});
