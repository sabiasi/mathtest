import { expect, test } from "@playwright/test";
import { openWindow, type Language } from "./recorder";

/**
 * Video: how to make a multiple-choice question in a math test.
 *   npm run tutorials   → public/tutorials/math-multiple-choice.ka.webm + .en.webm
 * Shown by the "▶ How to use it?" button on multiple-choice cards (math toolkit `tutorials`).
 */

const TEXT = {
  ka: {
    title: "არჩევითი პასუხით",
    sub: "როგორ შევქმნათ კითხვა · მათემატიკა",
    testTitle: "განტოლებები",
    add: "დააჭირეთ „არჩევითი პასუხით“",
    write: "დაწერეთ კითხვა",
    formula: "ფორმულა: ღილაკი ზოლზე, მაგ. „წილადი“",
    question: ["ამოხსენით განტოლება: ", ""],
    options: "ჩაწერეთ სავარაუდო პასუხები",
    answers: ["1,5", "6", "5", "9"],
    correct: "მონიშნეთ სწორი პასუხი — დააჭირეთ მის ასოს",
    points: "მიუთითეთ ქულა",
    paper: "„ქაღალდზე ნახვა“ — ასე დაიბეჭდება",
    done: "მზადაა! ტესტი თავისით ინახება",
    fraction: "წილადი",
  },
  en: {
    title: "Multiple choice",
    sub: "How to make a question · Mathematics",
    testTitle: "Equations",
    add: "Click “Multiple choice”",
    write: "Write the question",
    formula: "Formula: a toolbar button, e.g. “Fraction”",
    question: ["Solve the equation: ", ""],
    options: "Write the possible answers",
    answers: ["1.5", "6", "5", "9"],
    correct: "Click the letter of the correct answer",
    points: "Set the points",
    paper: "“View on paper” — this is how it prints",
    done: "Done! The test saves itself",
    fraction: "Fraction",
  },
} satisfies Record<Language, Record<string, string | string[]>>;

/** An empty math test, as a guest would have it after "New test". */
const EMPTY_TEST = (title: string) => {
  const now = new Date().toISOString();
  return { id: "tutorial-test", title, subjectId: "math", schoolName: "", grade: "8", questions: [], createdAt: now, updatedAt: now };
};

for (const language of ["ka", "en"] as const) {
  test(`math: multiple choice (${language})`, async ({ browser }) => {
    test.setTimeout(120_000);
    const say = TEXT[language];
    const { context, page, director: d } = await openWindow(browser, language, {
      "mathtest:tests:v1": JSON.stringify([EMPTY_TEST(say.testTitle)]),
    });
    await page.goto("/editor/tutorial-test");
    const editor = page.locator('[data-editor-ready="true"]:visible');
    await expect(editor).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    await d.start();
    await d.title(say.title, say.sub);
    await d.pause(2200);
    await d.hideTitle();

    // 1. Add the question.
    const add = editor.locator('[data-add-type="multiple-choice"]');
    await d.scrollTo(add);
    await d.caption(1, say.add);
    await d.pause(600);
    await d.click(add);
    const card = editor.locator("[data-question-card]").first();
    const questionBox = card.locator(".rich-text-input").first();
    await expect(questionBox.locator(".ProseMirror")).toBeFocused();
    await d.scrollBelow(card, editor.locator("[data-math-toolbar]"));

    // 2. The question, with a formula from the toolbar.
    await d.caption(2, say.write);
    await d.type(say.question[0]);
    await d.caption(3, say.formula);
    const fraction = editor.locator("[data-math-toolbar]").getByRole("button", { name: say.fraction, exact: true });
    await d.pause(500);
    await d.click(fraction);
    await expect(questionBox.locator("math-field")).toBeFocused();
    await d.type("x");
    await d.press("Tab");
    await d.type("2");
    await d.press("ArrowRight"); // out of the fraction
    await d.type("=3");
    await d.press("ArrowRight"); // out of the formula, back to the text
    if (say.question[1]) await d.type(say.question[1]);
    await d.pause(500);

    // 3. The answers.
    await d.caption(4, say.options);
    const options = card.locator("ul .rich-text-input");
    for (const [index, answer] of say.answers.entries()) {
      await d.click(options.nth(index));
      await d.type(answer, 110);
    }
    await d.pause(400);

    // 4. The correct one.
    await d.caption(5, say.correct);
    await d.pause(500);
    const letters = card.locator("ul button[aria-pressed]");
    await d.click(letters.nth(1));
    await expect(letters.nth(1)).toHaveAttribute("aria-pressed", "true");
    await d.pause(1300);

    // 5. Points.
    await d.caption(6, say.points);
    const points = card.locator('input[inputmode="decimal"]');
    await d.click(points);
    await page.keyboard.press("ControlOrMeta+A");
    await d.type("2", 150);
    await d.pause(900);

    // 6. The paper.
    await d.caption(7, say.paper);
    const paperView = editor.locator("[data-paper-view-toggle]");
    await d.click(paperView);
    const sheet = page.locator(".live-preview .sheet").first();
    await expect(sheet).toBeVisible();
    await d.pause(1400); // the paper redraws a moment after it opens
    await d.pointAt(sheet.locator("[data-print-block]").first(), { x: 0.35, y: 0.6 });
    await d.pause(2800);
    await d.caption(null, say.done);
    await d.pause(2200);

    await d.finish(`public/tutorials/math-multiple-choice.${language}.webm`);
    await context.close();
  });
}
