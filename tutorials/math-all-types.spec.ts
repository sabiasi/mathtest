import { expect, test, type Locator } from "@playwright/test";
import { dictionaries } from "../src/i18n/dictionaries";
import { TUTORIAL_LANGUAGES } from "../src/features/tutorials/tutorials";
import { openWindow, type Language } from "./recorder";

/**
 * Video: the math guide — every question type of a math test, one chapter each.
 *   npm run tutorials   → public/tutorials/math-all-types.ka.webm / .en.webm (+ .json chapters)
 * Shown by the "▶ Video guide" buttons in the editor (math toolkit `guideVideo`).
 * Button names come from the app's own dictionaries, so the script follows the real UI.
 */

const TEXT = {
  ka: {
    title: "მათემატიკის ტესტი",
    sub: "ყველა ტიპის კითხვა — ნაბიჯ-ნაბიჯ",
    testTitle: "შემაჯამებელი წერა",
    // 1. Multiple choice
    mcAdd: "„არჩევითი პასუხით“ — ერთი სწორი პასუხი",
    mcText: "დაწერეთ კითხვა; ფორმულა — ღილაკით ზოლზე",
    mcQuestion: "გამოთვალეთ: ",
    mcOptions: "ჩაწერეთ პასუხები და დააჭირეთ სწორის ასოს",
    mcAnswers: ["0,75", "0,5", "1", "0,25"],
    points: "ქულა — ჯამი თავისით ითვლება",
    // 2. True / false
    tfAdd: "„სწორია / მცდარია“ — დებულება",
    tfText: "„Σ ფორმულა“ — ცარიელი ფორმულა",
    tfCorrect: "მონიშნეთ სწორი პასუხი",
    // 3. Open
    oaAdd: "„ღია კითხვა“ — ამოხსნისთვის",
    oaQuestion: "ამოხსენით განტოლება: ",
    oaSpace: "აირჩიეთ, რა ადგილი დარჩეს ფურცელზე",
    oaKey: "პასუხი ჩანს მხოლოდ პასუხების ფურცელზე",
    // 4. Matching
    mAdd: "„შესაბამისობა“ — ორი სვეტი",
    mQuestion: "შეუსაბამეთ გამოსახულება მის მნიშვნელობას.",
    mPairs: "ჩაწერეთ სწორი წყვილები — ფურცელზე აირევა",
    pairs: [["5 · 6", "30"], ["48 : 8", "6"], ["7 + 9", "16"]],
    mExtra: "ზედმეტი პასუხი — უფრო რთულია გამოცნობა",
    extra: "12",
    // 5. Fill in the blanks
    fAdd: "„გამოტოვებული სიტყვები“",
    fQuestion: "შეავსეთ გამოტოვებული ადგილები.",
    fText: "ჩაწერეთ სრული, სწორი ტექსტი",
    fBody: "სამკუთხედის კუთხეების ჯამი 180 გრადუსია, ოთხკუთხედისა კი 360 გრადუსი.",
    fBlanks: ["180", "360"],
    fPick: "დააჭირეთ სიტყვებს, რომლებიც უნდა გამოტოვდეს",
    fMode: "ან სიტყვების ყუთი ფურცელზე",
    // 6. Geometry
    gAdd: "გეომეტრიული ფიგურა — ნებისმიერ კითხვაში",
    gQuestion: "იპოვეთ AB გვერდის სიგრძე.",
    gShape: "აირჩიეთ ფიგურა და ჩაწერეთ გვერდები",
    gSides: ["?", "4 სმ", "3 სმ"],
    gInsert: "„ჩასმა“ — ფიგურა კითხვაშია",
    // 7. Paper
    paper: "„ქაღალდზე ნახვა“ — ასე დაიბეჭდება",
    key: "„პასუხები“ — მასწავლებლის ფურცელი",
    print: "„ბეჭდვა / PDF“ — როცა მზად იქნებით",
    done: "მზადაა! ტესტი თავისით ინახება",
    // What the voice says (Azure's Georgian voice "Eka"; see tutorials/voice.ts), by caption.
    say: {
      intro: "ამ ვიდეოში ვნახავთ მათემატიკის ტესტის ყველა ტიპის კითხვას.",
      mcAdd: "დავიწყოთ კითხვით არჩევითი პასუხით — მოსწავლე ერთ სწორ პასუხს ირჩევს.",
      mcText: "დაწერეთ კითხვა. ფორმულისთვის დააჭირეთ ღილაკს ზოლზე, მაგალითად „წილადს“.",
      mcOptions: "ჩაწერეთ პასუხები და დააჭირეთ სწორი პასუხის ასოს.",
      points: "მიუთითეთ ქულა. ტესტის ჯამი თავისით ითვლება.",
      tfAdd: "შემდეგი ტიპია „სწორია ან მცდარია“: მოსწავლე წყვეტს, სწორია თუ არა დებულება.",
      tfText: "ღილაკი „ფორმულა“ ჩასვამს ცარიელ ფორმულას, სადაც თავისუფლად შეგიძლიათ წერა.",
      tfCorrect: "მონიშნეთ სწორი პასუხი.",
      oaAdd: "ღია კითხვაზე მოსწავლე თავად წერს ამოხსნას.",
      oaSpace: "აირჩიეთ, რა დარჩეს ფურცელზე: ერთი ხაზი, ხაზები თუ ცარიელი ადგილი.",
      oaKey: "სწორი პასუხიც შეგიძლიათ ჩაწეროთ — ის მხოლოდ პასუხების ფურცელზე გამოჩნდება.",
      mAdd: "შესაბამისობაში მოსწავლე ორ სვეტს ერთმანეთთან აკავშირებს.",
      mPairs: "ჩაწერეთ სწორი წყვილები. ფურცელზე მარჯვენა სვეტი თავისით აირევა.",
      mExtra: "ზედმეტი პასუხი გამოცნობას ართულებს.",
      fAdd: "შემდეგია გამოტოვებული სიტყვები.",
      fText: "ჩაწერეთ სრული, სწორი ტექსტი.",
      fPick: "შემდეგ დააჭირეთ სიტყვებს, რომლებიც უნდა გამოტოვდეს.",
      fMode: "მოსწავლე სიტყვებს თავად წერს, ან ყუთიდან ირჩევს.",
      gAdd: "გეომეტრიული ფიგურის დამატება ნებისმიერ კითხვაშია შესაძლებელი.",
      gShape: "აირჩიეთ ფიგურა და ჩაწერეთ გვერდების წარწერები.",
      gInsert: "დააჭირეთ „ჩასმას“ — ფიგურა უკვე კითხვაშია.",
      paper: "„ქაღალდზე ნახვა“ გაჩვენებთ მთელ ტესტს ისე, როგორც დაიბეჭდება.",
      key: "„პასუხები“ კი მასწავლებლის ფურცელია, სწორი პასუხებით.",
      print: "როცა მზად იქნებით, დააჭირეთ „ბეჭდვა / PDF“-ს.",
      done: "მზადაა! ტესტი თავისით ინახება. წარმატებებს გისურვებთ!",
    },
  },
  en: {
    title: "A math test",
    sub: "Every question type — step by step",
    testTitle: "Unit test",
    mcAdd: "“Multiple choice” — one correct answer",
    mcText: "Write the question; formulas from the toolbar",
    mcQuestion: "Work out: ",
    mcOptions: "Write the answers and click the correct letter",
    mcAnswers: ["0.75", "0.5", "1", "0.25"],
    points: "Points — the total adds up by itself",
    tfAdd: "“True / false” — a statement",
    tfText: "“Σ Formula” — an empty formula",
    tfCorrect: "Mark the correct answer",
    oaAdd: "“Open question” — room for working",
    oaQuestion: "Solve the equation: ",
    oaSpace: "Choose what room is left on the paper",
    oaKey: "The answer shows only on the answer key",
    mAdd: "“Matching” — two columns",
    mQuestion: "Match each expression to its value.",
    mPairs: "Write the correct pairs — the paper mixes them",
    pairs: [["5 · 6", "30"], ["48 : 8", "6"], ["7 + 9", "16"]],
    mExtra: "An extra answer makes guessing harder",
    extra: "12",
    fAdd: "“Fill in the blanks”",
    fQuestion: "Fill in the gaps.",
    fText: "Write the full, correct text",
    fBody: "The angles of a triangle add up to 180 degrees, and those of a quadrilateral to 360 degrees.",
    fBlanks: ["180", "360"],
    fPick: "Click the words to leave out",
    fMode: "Or a word box on the paper",
    gAdd: "A geometric figure — in any question",
    gQuestion: "Find the length of side AB.",
    gShape: "Choose a figure and label its sides",
    gSides: ["?", "4 cm", "3 cm"],
    gInsert: "“Insert” — the figure is in the question",
    paper: "“Preview on paper” — this is how it prints",
    key: "“Answer key” — the teacher's copy",
    print: "“Print / PDF” — when you're ready",
    done: "Done! The test saves itself",
    say: {
      intro: "In this video we'll look at every question type of a math test.",
      mcAdd: "Let's start with multiple choice: the student picks one correct answer.",
      mcText: "Write the question. For a formula, click a toolbar button, for example “Fraction”.",
      mcOptions: "Write the answers and click the letter of the correct one.",
      points: "Set the points. The test's total adds up by itself.",
      tfAdd: "Next is true or false: the student decides whether a statement is right.",
      tfText: "The “Formula” button inserts an empty formula you can type freely in.",
      tfCorrect: "Mark the correct answer.",
      oaAdd: "In an open question, the student writes the working themselves.",
      oaSpace: "Choose what is left on the paper: one line, lines, or blank space.",
      oaKey: "You can also write the answer. It only shows on the answer key.",
      mAdd: "In matching, the student connects two columns.",
      mPairs: "Write the correct pairs. On the paper, the right column is mixed up automatically.",
      mExtra: "An extra answer makes guessing harder.",
      fAdd: "Next: fill in the blanks.",
      fText: "Write the full, correct text.",
      fPick: "Then click the words to leave out.",
      fMode: "Students write the words, or pick them from a box.",
      gAdd: "You can add a geometric figure to any question.",
      gShape: "Choose a figure and label its sides.",
      gInsert: "Click “Insert”. The figure is now in the question.",
      paper: "“Preview on paper” shows the whole test as it will print.",
      key: "“Answer key” is the teacher's copy, with the correct answers.",
      print: "When you're ready, click “Print / PDF”.",
      done: "Done! The test saves itself. Good luck!",
    },
  },
} satisfies Record<Language, Record<string, string | string[] | string[][] | Record<string, string>>>;

/** A caption's name: its text and its spoken sentence share it. */
type Step = keyof (typeof TEXT)["ka"]["say"];

// Only the languages the app plays (TUTORIAL_LANGUAGES: Georgian for now); the English texts wait for later.
for (const language of TUTORIAL_LANGUAGES as readonly Language[]) {
  test(`math: every question type (${language})`, async ({ browser }) => {
    test.setTimeout(300_000);
    const say = TEXT[language];
    const ui = dictionaries[language];
    const now = new Date().toISOString();
    const { context, page, director: d } = await openWindow(browser, language, {
      "mathtest:tests:v1": JSON.stringify([
        { id: "tutorial-test", title: say.testTitle, subjectId: "math", schoolName: "", grade: "8", questions: [], createdAt: now, updatedAt: now },
      ]),
    });
    await page.goto("/editor/tutorial-test");
    const editor = page.locator('[data-editor-ready="true"]:visible');
    await expect(editor).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const toolbar = editor.locator("[data-math-toolbar]");
    const cards = editor.locator("[data-question-card]");
    let step = 0;
    const caption = (key: Exclude<Step, "intro" | "done">) => d.caption(++step, say[key], say.say[key]);

    /** Adds a question of `type` (the "add a question" panel) and shows its card under the toolbar. */
    async function addQuestion(type: string): Promise<Locator> {
      const add = editor.locator(`[data-add-type="${type}"]`);
      await d.scrollTo(add);
      await d.pause(400);
      const count = await cards.count();
      await d.click(add);
      await expect(cards).toHaveCount(count + 1);
      const card = cards.last();
      await expect(card.locator(".rich-text-input .ProseMirror").first()).toBeFocused();
      await d.scrollBelow(card, toolbar);
      return card;
    }

    /** Leaves a formula: the cursor goes back to the text after it. */
    async function leaveFormula(box: Locator) {
      for (let i = 0; i < 4 && (await box.locator("math-field:focus").count()) > 0; i++) await d.press("ArrowRight");
    }

    await d.prepare(Object.values(say.say)); // the voice is made before recording starts

    await d.start();
    await d.title(say.title, say.sub);
    await d.say(say.say.intro);
    await d.pause(2400);
    await d.waitForSpeech();
    await d.hideTitle();

    // ---- 1. Multiple choice ----
    d.chapter(ui["type.multiple-choice"]);
    await caption("mcAdd");
    let card = await addQuestion("multiple-choice");
    let box = card.locator(".rich-text-input").first();
    await caption("mcText");
    await d.type(say.mcQuestion, 55);
    const fraction = toolbar.getByRole("button", { name: language === "ka" ? "წილადი" : "Fraction", exact: true });
    await d.click(fraction);
    await expect(box.locator("math-field")).toBeFocused();
    await d.type("1", 90);
    await d.press("Tab");
    await d.type("2", 90);
    await d.press("ArrowRight");
    await d.type("+", 90);
    await d.click(fraction);
    await d.type("1", 90);
    await d.press("Tab");
    await d.type("4", 90);
    await leaveFormula(box);
    await caption("mcOptions");
    const options = card.locator("ul .rich-text-input");
    for (const [index, answer] of say.mcAnswers.entries()) {
      await d.click(options.nth(index));
      await d.type(answer, 70);
    }
    await d.click(card.locator("ul button[aria-pressed]").first());
    await expect(card.locator("ul button[aria-pressed]").first()).toHaveAttribute("aria-pressed", "true");
    await d.pause(700);
    await caption("points");
    await d.click(card.locator('input[inputmode="decimal"]'));
    await page.keyboard.press("ControlOrMeta+A");
    await d.type("2", 150);
    await d.pause(900);

    // ---- 2. True / false ----
    d.chapter(ui["type.true-false"]);
    await caption("tfAdd");
    card = await addQuestion("true-false");
    box = card.locator(".rich-text-input").first();
    await caption("tfText");
    await d.click(toolbar.locator("[data-insert-formula]"));
    await expect(box.locator("math-field")).toBeFocused();
    await d.type("2^5", 110);
    await d.press("ArrowRight"); // out of the power
    await d.type("=32", 90);
    await leaveFormula(box);
    await d.pause(400);
    await caption("tfCorrect");
    const trueButton = card.getByRole("button", { name: ui["tf.true"], exact: true });
    await d.click(trueButton);
    await expect(trueButton).toHaveAttribute("aria-pressed", "true");
    await d.pause(1200);

    // ---- 3. Open question ----
    d.chapter(ui["type.open-answer"]);
    await caption("oaAdd");
    card = await addQuestion("open-answer");
    box = card.locator(".rich-text-input").first();
    await d.type(say.oaQuestion, 55);
    await d.click(toolbar.locator("[data-insert-formula]"));
    await expect(box.locator("math-field")).toBeFocused();
    await d.type("2x+3=11", 90);
    await leaveFormula(box);
    await caption("oaSpace");
    const spaces = card.locator("[data-open-answer-space]");
    await d.scrollTo(spaces);
    await d.click(spaces.getByRole("button", { name: ui["oa.style.lines"], exact: true }));
    await d.pause(1100);
    await d.click(spaces.getByRole("button", { name: ui["oa.style.blank"], exact: true }));
    await d.pause(1000);
    await caption("oaKey");
    await d.click(card.locator("[data-open-answer-key] .rich-text-input"));
    await d.type("x = 4", 110);
    await d.pause(1100);

    // ---- 4. Matching ----
    d.chapter(ui["type.matching"]);
    await caption("mAdd");
    card = await addQuestion("matching");
    await d.type(say.mQuestion, 50);
    await caption("mPairs");
    const pairs = card.locator("[data-pair]");
    await d.scrollTo(pairs.first());
    for (const [index, [left, right]] of say.pairs.entries()) {
      await d.click(pairs.nth(index).locator(".rich-text-input").first());
      await d.type(left, 75);
      await d.click(pairs.nth(index).locator(".rich-text-input").nth(1));
      await d.type(right, 75);
    }
    await caption("mExtra");
    await d.click(card.getByRole("button", { name: ui["matching.addExtra"] }));
    const extra = card.getByRole("textbox", { name: ui["matching.extra"].replace("{number}", "1") });
    await d.click(extra);
    await d.type(say.extra, 100);
    await d.pause(1000);

    // ---- 5. Fill in the blanks ----
    d.chapter(ui["type.fill-blank"]);
    await caption("fAdd");
    card = await addQuestion("fill-blank");
    await d.type(say.fQuestion, 50);
    await caption("fText");
    const body = card.locator("[data-fill-blank-editor] textarea");
    await d.click(body);
    await d.type(say.fBody, 38);
    await caption("fPick");
    const words = card.locator("[data-word-picker]");
    await d.scrollTo(words);
    for (const word of say.fBlanks) {
      const button = words.getByRole("button", { name: word, exact: true });
      await d.click(button);
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await d.pause(300);
    }
    await d.pause(600);
    await caption("fMode");
    await d.click(card.getByRole("button", { name: ui["fill.modeBank"], exact: true }));
    await d.pause(1400);

    // ---- 6. Geometric figure ----
    d.chapter(ui["diagram.new.geometry"]);
    await caption("gAdd");
    card = await addQuestion("open-answer");
    await d.type(say.gQuestion, 55);
    const newFigure = card.locator('[data-new-diagram="geometry"]');
    await d.scrollTo(newFigure);
    await d.click(newFigure);
    const dialog = page.locator('[data-diagram-dialog="geometry"]');
    await expect(dialog).toBeVisible();
    await d.pause(600);
    await caption("gShape");
    await d.click(dialog.locator('[data-geometry-triangle="right"]'));
    await d.pause(500);
    await d.click(dialog.locator("[data-geometry-labels]")); // letters and side labels (folded at first)
    for (const [index, label] of say.gSides.entries()) {
      const side = dialog.locator(`[data-geometry-side="${index}"]`);
      await d.click(side);
      await page.keyboard.press("ControlOrMeta+A");
      await d.type(label, 90);
    }
    await d.pause(900);
    await caption("gInsert");
    await d.click(dialog.locator("[data-diagram-save]"));
    await expect(dialog).toHaveCount(0);
    await d.scrollTo(card.locator("svg").first());
    await d.pause(1600);

    // ---- 7. On paper ----
    d.chapter(ui["preview.title"]);
    await caption("paper");
    await d.click(editor.locator("[data-paper-view-toggle]"));
    const sheets = page.locator(".live-preview .sheet");
    await expect(sheets.first()).toBeVisible();
    await d.pause(1400); // the paper redraws a moment after it opens
    await d.pointAt(sheets.first(), { x: 0.5, y: 0.35 });
    await d.pause(1200);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 260);
      await d.pause(450);
    }
    await d.pause(800);
    await caption("key");
    await d.click(page.getByRole("button", { name: ui["print.key"], exact: true }));
    await d.pause(1200);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, -260);
      await d.pause(350);
    }
    await d.pause(1800);
    await caption("print");
    await d.pointAt(editor.getByRole("link", { name: ui["editor.printPreview"] }));
    await d.pause(1800);
    await d.caption(null, say.done, say.say.done);
    await d.pause(2200);

    await d.finish(`public/tutorials/math-all-types.${language}.webm`);
    await context.close();
  });
}
