import { expect, test, type Page } from "@playwright/test";
import { collectErrors, editor, openSampleCopy, SUBJECTS } from "./helpers";

/**
 * Nothing on paper may stick out of its column or run under the page footer —
 * checked on every subject's sample (it uses every question type), in one and
 * two columns, normal and large letters, student paper and answer key.
 *
 * Found by this check, on two-column papers: long formulas on the key ran off
 * the page; matching lists, the ecological pyramid, the taxonomy staircase,
 * the timeline, diagram label boxes and climate questions were wider than the
 * column (or, squeezed, taller than the page).
 */
type Layout = { columns: 1 | 2; fontSize: "normal" | "large"; query: string };
const LAYOUTS: Layout[] = [
  { columns: 1, fontSize: "normal", query: "version=key" },
  { columns: 2, fontSize: "normal", query: "version=student" },
  { columns: 2, fontSize: "normal", query: "version=key" },
  { columns: 2, fontSize: "large", query: "version=student&variant=II" },
  { columns: 1, fontSize: "large", query: "version=key&variant=all" },
];

/** Changes the saved test's print options the way the print page's own controls do (guest tests live in localStorage). */
const setLayout = (page: Page, id: string, layout: Layout) =>
  page.evaluate(
    ({ id, layout }) => {
      const key = "mathtest:tests:v1";
      const tests = JSON.parse(localStorage.getItem(key)!);
      const saved = tests.find((x: { id: string }) => x.id === id);
      saved.printOptions.columns = layout.columns;
      saved.printOptions.fontSize = layout.fontSize;
      saved.variants.count = 3;
      localStorage.setItem(key, JSON.stringify(tests));
    },
    { id, layout },
  );

/** Everything on the visible sheets that leaves its column (right / left) or goes under the footer. */
const overflowing = (page: Page) =>
  page.evaluate(() => {
    const found: string[] = [];
    const sheets = [...document.querySelectorAll<HTMLElement>(".sheet")].filter((sheet) => sheet.checkVisibility());
    sheets.forEach((sheet, index) => {
      const footer = sheet.querySelector<HTMLElement>(":scope > .sheet-footer");
      const bottom = footer ? footer.getBoundingClientRect().top : sheet.getBoundingClientRect().bottom;
      for (const column of sheet.querySelectorAll<HTMLElement>(":scope > .sheet-columns > div")) {
        const edge = column.getBoundingClientRect();
        for (const el of column.querySelectorAll<Element>("*")) {
          // Drawings are checked as a whole (their <svg>); line numbers sit in the margin on purpose.
          if (el.parentElement?.closest("svg")) continue;
          // A formula too (MathLive puts invisible spacers inside it that reach past its edge).
          if (el.parentElement?.closest(".math-static")) continue;
          if (el.closest(".print-line-numbers")) continue;
          const box = el.getBoundingClientRect();
          if (box.width === 0 || box.height === 0) continue;
          const right = box.right - edge.right;
          const left = edge.left - box.left;
          const under = box.bottom - bottom;
          if (right > 2 || left > 2 || under > 2) {
            found.push(`sheet ${index + 1}: <${el.tagName.toLowerCase()} class="${el.getAttribute("class") ?? ""}"> right ${Math.round(right)} left ${Math.round(left)} under ${Math.round(under)} "${(el.textContent ?? "").trim().slice(0, 40)}"`);
            break; // one line per column is enough to find it
          }
        }
      }
    });
    return { sheets: sheets.length, found };
  });

for (const subject of SUBJECTS) {
  test(`${subject}: nothing leaves its column or the page (1 and 2 columns, student and key)`, async ({ page }) => {
    test.slow();
    const errors = collectErrors(page);
    await openSampleCopy(page, subject);
    await expect(editor(page).locator('[data-save-state="saved"]')).toBeVisible({ timeout: 15_000 });
    const id = page.url().split("/").pop()!;
    for (const layout of LAYOUTS) {
      await setLayout(page, id, layout);
      await page.goto(`/print/${id}?${layout.query}`);
      await expect(page.locator('[data-print-ready="true"]:visible')).toBeVisible({ timeout: 60_000 });
      const name = `${layout.columns} column(s), ${layout.fontSize}, ${layout.query}`;
      await expect.poll(async () => (await overflowing(page)).found, name).toEqual([]);
      expect((await overflowing(page)).sheets, name).toBeGreaterThan(0);
      if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/pl-${subject}-${layout.columns}-${layout.fontSize}-${layout.query.replace(/\W+/g, "_")}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
