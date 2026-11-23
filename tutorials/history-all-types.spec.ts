import { expect, test, type Locator } from "@playwright/test";
import { dictionaries } from "../src/i18n/dictionaries";
import { GEORGIA_PLACES, georgiaPercent } from "../src/lib/images/builtinPictures";
import { openWindow } from "./recorder";

/**
 * Video: the history guide — the paper view open from the start (every question appears on the
 * A4 page while it is written), every history question type, the answer key, and variants I / II.
 *   npm run tutorials -- history   → public/tutorials/history-all-types.ka.webm (+ .json chapters)
 * Shown by the "▶ Video guide" buttons in the editor (history toolkit `guideVideo`).
 * The owner's own voice: tutorials/recorded/history-all-types/ka/ (SENTENCES.md + 01.m4a …);
 * a sentence without a recording gets the computer voice.
 * Georgian only for now (TUTORIAL_LANGUAGES); button names come from the app's dictionaries.
 */

const TEXT = {
  title: "ისტორიის ტესტი",
  sub: "კითხვები, ფურცელი და ვარიანტები",
  testTitle: "საქართველო შუა საუკუნეებში",
  // 0. Paper view
  paper: "„ქაღალდზე ნახვა“ — ფურცელი ყოველთვის გვერდით",
  // 1. Multiple choice
  mcAdd: "„არჩევითი პასუხით“ — ერთი სწორი პასუხი",
  mcQuestion: "დიდგორის ბრძოლა 1121 წელს მოხდა. რომელ საუკუნეს ეკუთვნის ეს წელი?",
  mcCentury: "საუკუნის ხელსაწყო: 1121 → XII ს.",
  mcCorrect: "დანარჩენი პასუხები და სწორი ასო",
  mcOthers: ["XI ს.", "XIII ს.", "X ს."],
  mcLook: "კითხვა ფურცელზე მაშინვე ჩანს",
  // 2. Matching
  mAdd: "„შესაბამისობა“ — ორი სვეტი",
  mQuestion: "შეუსაბამეთ პიროვნება მოვლენას.",
  mTemplate: "შაბლონი — სვეტების სათაურები ერთი დაჭერით",
  mPairs: "სწორი წყვილები — ფურცელზე აირევა",
  pairs: [
    ["დავით აღმაშენებელი", "დიდგორის ბრძოლა"],
    ["თამარ მეფე", "შამქორის ბრძოლა"],
    ["ერეკლე II", "გეორგიევსკის ტრაქტატი"],
  ],
  // 3. Chronological order
  oAdd: "„ქრონოლოგიური თანმიმდევრობა“",
  oQuestion: "დაალაგეთ მოვლენები ქრონოლოგიური თანმიმდევრობით.",
  oItems: "ჩაწერეთ სწორი რიგით — ფურცელზე აირევა",
  events: ["საქართველოს გაერთიანება", "დიდგორის ბრძოლა", "შამქორის ბრძოლა", "კრწანისის ბრძოლა"],
  // 4. Source
  sAdd: "„წყაროზე დაფუძნებული“ — ტექსტი და კითხვები",
  sQuestion: "წაიკითხეთ ტექსტი და უპასუხეთ კითხვებს.",
  sText:
    "1121 წელს დიდგორთან ქართველთა ლაშქარმა დავით აღმაშენებლის მეთაურობით სელჩუკთა დიდი ჯარი დაამარცხა. მომდევნო წელს თბილისი გათავისუფლდა.",
  sCaptionText: "მასწავლებლის მიერ შედგენილი ტექსტი",
  sCaption: "საიდანაა ტექსტი",
  sParts: "კითხვა ტექსტზე — პასუხი მხოლოდ მასწავლებელს უჩანს",
  parts: [["ვინ მეთაურობდა ქართველთა ლაშქარს?", "დავით აღმაშენებელი"]],
  // 5. Map
  mapAdd: "„რუკა“ — მზა რუკა ან თქვენი სურათი",
  mapQuestion: "რუკაზე ციფრებით აღნიშნულია ქალაქები. დაწერეთ მათი სახელები.",
  mapMarkers: "დააჭირეთ რუკას — დაისმება ნომერი",
  places: [
    ["tbilisi", "თბილისი"],
    ["kutaisi", "ქუთაისი"],
  ] as const,
  // 6. Key, print page, variants
  key: "„პასუხები“ — მასწავლებლის ფურცელი",
  variants: "„ბეჭდვა / PDF“ → ვარიანტები: I და II",
  variantB: "II ვარიანტი — იგივე კითხვები, სხვა რიგით",
  variantsAll: "„ყველა“ + „პასუხები“ — პასუხების ცხრილი ყველა ვარიანტისთვის",
  done: "მზადაა! ტესტი თავისით ინახება",
  // What the voice says, by caption (the owner's recordings: tutorials/recorded/history-all-types/ka/).
  say: {
    intro: "ვნახოთ, როგორ იქმნება ისტორიის ტესტი.",
    paper: "ჩავრთოთ „ქაღალდზე ნახვა“: მარჯვნივ ჩანს, როგორ დაიბეჭდება ტესტი.",
    mcAdd: "დავიწყოთ კითხვით არჩევითი პასუხით.",
    mcCentury: "საუკუნის ხელსაწყო წელს რომაულ ციფრად გადაიყვანს.",
    mcCorrect: "ჩაწერეთ დანარჩენი პასუხები და მონიშნეთ სწორი.",
    mcLook: "შეხედეთ: კითხვა ფურცელზეც მაშინვე გამოჩნდა.",
    mAdd: "შესაბამისობაში პიროვნებას მოვლენასთან აკავშირებენ.",
    mTemplate: "შაბლონი სვეტების სათაურებს ერთი დაჭერით ჩაწერს.",
    mPairs: "ჩაწერეთ სწორი წყვილები. ფურცელზე მარჯვენა სვეტი თავისით აირევა.",
    oAdd: "ქრონოლოგიურ თანმიმდევრობაში მოსწავლე მოვლენებს ალაგებს.",
    oItems: "ჩაწერეთ მოვლენები სწორი რიგით — ფურცელზე ისინი აირევა.",
    sAdd: "წყაროზე დაფუძნებულ კითხვაში ჩასვით ტექსტი, ციტატა ან დოკუმენტი.",
    sCaption: "ქვემოთ მიუთითეთ, საიდანაა ტექსტი.",
    sParts: "დაწერეთ კითხვა ტექსტზე. პასუხს მხოლოდ მასწავლებელი დაინახავს.",
    mapAdd: "აირჩიეთ საქართველოს კონტურული რუკა, ან ატვირთეთ თქვენი.",
    mapMarkers: "დააჭირეთ რუკას — დაისმება ნომერი. გვერდით დაწერეთ პასუხი.",
    key: "„პასუხები“ გაჩვენებთ მასწავლებლის ფურცელს, ყველა სწორი პასუხით.",
    variants: "ბეჭდვის გვერდზე აირჩიეთ ორი ვარიანტი — კითხვები და პასუხები სხვა რიგით იქნება.",
    variantB: "ასე მეზობელი მოსწავლეები ერთმანეთს ვეღარ გადაიწერენ.",
    variantsAll: "„ყველა“ ერთად აჩვენებს ყველა ვარიანტს, პასუხების ცხრილით.",
    done: "მზადაა! ტესტი თავისით ინახება. წარმატებებს გისურვებთ!",
  },
};

type Step = keyof typeof TEXT.say;

test("history: every question type, paper view and variants (ka)", async ({ browser }) => {
  test.setTimeout(300_000);
  const say = TEXT;
  const ui = dictionaries.ka;
  const now = new Date().toISOString();
  const { context, page, director: d } = await openWindow(browser, "ka", {
    "mathtest:tests:v1": JSON.stringify([
      { id: "tutorial-test", title: say.testTitle, subjectId: "history", schoolName: "", grade: "9", questions: [], createdAt: now, updatedAt: now },
    ]),
  });
  await page.goto("/editor/tutorial-test");
  const editor = page.locator('[data-editor-ready="true"]:visible');
  await expect(editor).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const toolbar = editor.locator("[data-math-toolbar]");
  const cards = editor.locator("[data-question-card]");
  const sheets = page.locator(".live-preview .sheet");
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

  await d.prepare(Object.values(say.say)); // the voice is made (or the recordings cleaned) before recording starts

  await d.start();
  await d.title(say.title, say.sub);
  await d.say(say.say.intro);
  await d.pause(1500);
  await d.waitForSpeech();
  await d.hideTitle();

  // ---- 0. The paper, open from the start ----
  d.chapter(ui["preview.title"]);
  await caption("paper");
  await d.click(editor.locator("[data-paper-view-toggle]"));
  await expect(sheets.first()).toBeVisible();
  await d.pause(1200);
  await d.pointAt(sheets.first(), { x: 0.5, y: 0.2 });
  await d.pause(900);

  // ---- 1. Multiple choice + the century tool ----
  d.chapter(ui["type.multiple-choice"]);
  await caption("mcAdd");
  let card = await addQuestion("multiple-choice");
  await d.type(say.mcQuestion, 28);
  const options = card.locator("ul .rich-text-input");
  await d.click(options.nth(1)); // the correct answer is б (B)
  await caption("mcCentury");
  const century = toolbar.locator("[data-century-tool]");
  await d.click(century.locator("input"));
  await d.type("1121", 160);
  await d.pause(500);
  await d.click(century.getByRole("button", { name: "XII ს.", exact: true }));
  await expect(options.nth(1)).toContainText("XII");
  await caption("mcCorrect");
  for (const [index, answer] of [[0, say.mcOthers[0]], [2, say.mcOthers[1]], [3, say.mcOthers[2]]] as const) {
    await d.click(options.nth(index));
    await d.type(answer, 80);
  }
  const correct = card.locator("ul button[aria-pressed]").nth(1);
  await d.click(correct);
  await expect(correct).toHaveAttribute("aria-pressed", "true");
  await caption("mcLook");
  await d.pointAt(page.locator(".live-preview [data-editing]").first(), { x: 0.3, y: 0.4 });
  await d.pause(1500);

  // ---- 2. Matching ----
  d.chapter(ui["type.matching"]);
  await caption("mAdd");
  card = await addQuestion("matching");
  await d.type(say.mQuestion, 45);
  await caption("mTemplate");
  const template = card.locator('[data-template="person-event"]');
  await d.scrollTo(template);
  await d.click(template);
  await d.pause(600);
  await caption("mPairs");
  const pairs = card.locator("[data-pair]");
  for (const [index, [left, right]] of say.pairs.entries()) {
    await d.click(pairs.nth(index).locator(".rich-text-input").first());
    await d.type(left, 32);
    await d.click(pairs.nth(index).locator(".rich-text-input").nth(1));
    await d.type(right, 32);
  }
  await d.pause(700);

  // ---- 3. Chronological order ----
  d.chapter(ui["type.order"]);
  await caption("oAdd");
  card = await addQuestion("order");
  await d.type(say.oQuestion, 28);
  await caption("oItems");
  const items = card.locator("[data-order-editor] .rich-text-input");
  await d.scrollTo(items.first());
  for (const [index, event] of say.events.entries()) {
    await d.click(items.nth(index));
    await d.type(event, 32);
  }
  await d.pause(900);

  // ---- 4. Source ----
  d.chapter(ui["type.source"]);
  await caption("sAdd");
  card = await addQuestion("source");
  await d.type(say.sQuestion, 28);
  const source = card.locator("[data-source-editor]");
  await d.click(source.locator(".rich-text-input").first());
  await d.type(say.sText, 16);
  await caption("sCaption");
  await d.click(source.getByRole("textbox", { name: ui["source.caption"] }));
  await d.type(say.sCaptionText, 28);
  await caption("sParts");
  const parts = source.locator("[data-source-part]");
  for (const [index, [question, answer]] of say.parts.entries()) {
    const part = parts.nth(index);
    await d.scrollTo(part);
    await d.click(part.locator(".rich-text-input").first());
    await d.type(question, 30);
    await d.click(part.getByRole("textbox", { name: ui["sa.answer"] }));
    await d.type(answer, 32);
  }
  await d.pause(600);

  // ---- 5. Map ----
  d.chapter(ui["type.map"]);
  await caption("mapAdd");
  card = await addQuestion("map");
  await d.type(say.mapQuestion, 28);
  const builtin = card.locator('[data-builtin-map="georgia"]');
  await d.scrollTo(builtin);
  await d.click(builtin);
  const canvas = card.locator("[data-map-canvas]");
  await expect(canvas).toBeVisible();
  await d.scrollTo(canvas);
  await caption("mapMarkers");
  for (const [index, [place, name]] of say.places.entries()) {
    const [lon, lat] = GEORGIA_PLACES[place];
    const at = georgiaPercent(lon, lat);
    await d.click(canvas, { x: at.x / 100, y: at.y / 100 });
    await expect(card.locator("[data-marker]")).toHaveCount(index + 1);
    const answer = card.getByRole("textbox", { name: ui["map.answer"].replace("{number}", String(index + 1)) });
    await d.click(answer);
    await d.type(name, 70);
  }
  await d.pause(900);

  // ---- 6. The answer key ----
  d.chapter(ui["print.key"]);
  await caption("key");
  await d.click(page.locator("[data-live-preview]").getByRole("button", { name: ui["print.key"], exact: true }));
  await d.pause(1200);
  await d.pointAt(sheets.first(), { x: 0.5, y: 0.4 });
  for (let i = 0; i < 2; i++) {
    await page.mouse.wheel(0, 300);
    await d.pause(450);
  }
  await d.pause(500);

  // ---- 7. Variants (print page) ----
  d.chapter(ui["variants.label"]);
  await caption("variants");
  await d.click(editor.getByRole("link", { name: ui["editor.printPreview"] }));
  await page.waitForURL(/\/print\//);
  const ready = page.locator('[data-print-ready="true"]');
  await expect(ready.first()).toBeAttached({ timeout: 30_000 });
  await d.pause(500);
  const count = page.getByRole("group", { name: ui["variants.count"] });
  await d.click(count.getByRole("button", { name: "2", exact: true }));
  const show = page.getByRole("group", { name: ui["variants.show"] });
  await expect(show).toBeVisible();
  await expect(ready.first()).toBeAttached({ timeout: 30_000 });
  await d.pause(800);
  await caption("variantB");
  await d.click(show.getByRole("button", { name: "II", exact: true }));
  await expect(ready.first()).toBeAttached({ timeout: 30_000 });
  await d.pause(600);
  await d.pointAt(page.locator(".print-sheets .sheet:visible").first(), { x: 0.5, y: 0.3 });
  for (let i = 0; i < 2; i++) {
    await page.mouse.wheel(0, 300);
    await d.pause(450);
  }
  await caption("variantsAll");
  await page.mouse.wheel(0, -2000);
  await d.click(show.getByRole("button", { name: ui["variants.all"], exact: true }));
  await expect(ready.first()).toBeAttached({ timeout: 30_000 });
  await d.pause(600);
  // The answer table comes first in "all variants" of the teacher's version (the key).
  await d.click(page.getByRole("group", { name: ui["print.version"] }).getByRole("button", { name: ui["print.key"], exact: true }));
  await expect(page.locator(".print-sheets .answer-table:visible").first()).toBeVisible({ timeout: 30_000 });
  await d.pause(1000);
  await d.pointAt(page.locator(".print-sheets .answer-table:visible").first(), { x: 0.5, y: 0.3 });
  await d.pause(1600);
  await d.caption(null, say.done, say.say.done);
  await d.pause(2200);

  await d.finish("public/tutorials/history-all-types.ka.webm");
  await context.close();
});
