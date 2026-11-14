import { expect, type Locator, type Page } from "@playwright/test";

export const SUBJECTS = ["math", "physics", "chemistry", "biology", "geography", "history", "georgian", "english"] as const;
export type Subject = (typeof SUBJECTS)[number];

/**
 * Forgets this browser's guest trial (the flag in all three places and the
 * guest's tests), so the next copy is a new free trial. Only for tests.
 */
export async function forgetGuestTrial(page: Page) {
  if (!page.url().startsWith("http")) return; // nothing opened yet: already a fresh guest
  // Leave the editor first: it saves its test once more on the way out.
  await page.goto("/privacy");
  await page.context().clearCookies({ name: "mathtest_trial" });
  await page.evaluate(async () => {
    localStorage.removeItem("mathtest:guest-trial");
    localStorage.removeItem("mathtest:tests:v1");
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase("mathtest-trial");
      request.onsuccess = request.onerror = request.onblocked = resolve;
    });
  });
}

/**
 * Opens an editable copy of a subject's sample test (a long test with every
 * question type) as a guest. Each copy is a new guest's free trial (see
 * forgetGuestTrial), so a test may open several subjects one after another.
 */
export async function openSampleCopy(page: Page, subject: Subject) {
  await forgetGuestTrial(page);
  await page.goto(`/editor/sample-${subject}`);
  await page.locator("[data-sample-banner] button").click();
  await page.waitForURL((url) => url.pathname.startsWith("/editor/") && !url.pathname.includes("sample-"));
  await expect(editor(page)).toBeVisible();
}

/**
 * The editor on screen. Visited pages stay in the DOM but hidden (React
 * <Activity>), so every locator starts from the VISIBLE editor.
 */
export const editor = (page: Page): Locator => page.locator('[data-editor-ready="true"]:visible');
export const cards = (page: Page): Locator => editor(page).locator("[data-question-card]");

/** The question text box of the n-th question card (0 = first). */
export const questionBox = (page: Page, n: number): Locator => cards(page).nth(n).locator(".rich-text-input").first();
/** The part of a box you type into (formulas inside it have their own fields). */
export const typingArea = (box: Locator): Locator => box.locator(".ProseMirror").first();
export const toolbar = (page: Page): Locator => editor(page).locator("[data-math-toolbar]");

/** Where the page is scrolled to, and where an element is on the screen. */
export const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));
export const screenTop = async (locator: Locator) => Math.round((await locator.boundingBox())!.y);

/** Console errors and crashes seen on a page (ignoring missing-network noise). */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|favicon|net::ERR/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

/** Everything written in a box: its text, the LaTeX of its formulas and its chemistry formulas. */
export const boxContent = (box: Locator) =>
  box.evaluate((el) =>
    JSON.stringify({
      text: el.querySelector(".ProseMirror")?.textContent ?? "",
      math: [...el.querySelectorAll("math-field")].map((mf) => (mf as HTMLElement & { value: string }).value),
      chem: [...el.querySelectorAll<HTMLInputElement>("input[data-chem]")].map((input) => input.value),
    }),
  );
