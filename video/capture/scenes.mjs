/**
 * The tour's scenes, in order (see ../storyboard.md).
 *
 * Each scene has:
 *  - `title`: the 2-second title card (Georgian),
 *  - `setup(page)`: gets the page ready BEFORE recording (not filmed),
 *  - `run(d, page)`: the filmed part, driven through the Director (director.mjs).
 *
 * Every scene runs in a fresh browser = a new guest (no account, no real data).
 * Captions are at most 8 words. Typing is real but played fast-forwarded
 * (`typeFast`), so the whole tour stays under two minutes.
 * When the site's UI changes, fix the selectors here and run
 * `npm run capture -- <scene id>` again.
 */
export const BASE = process.env.TOUR_URL ?? "http://localhost:3210";

const EDITOR = '[data-editor-ready="true"]:visible';
const editor = (page) => page.locator(EDITOR);
const cards = (page) => editor(page).locator("[data-question-card]");
const lastCard = (page) => cards(page).last();
const questionBox = (card) => card.locator(".rich-text-input .ProseMirror").first();
const toolbar = (page) => editor(page).locator("[data-math-toolbar]");
const toolbarButton = (page, label) => toolbar(page).locator(`button[aria-label^="${label}"]`).first();
const tab = (page, name) => toolbar(page).getByRole("tab", { name, exact: true });
const segment = (page, name) => page.locator("main [role=group] button", { hasText: new RegExp(`^${name}$`) }).first();

/* ---------- setup helpers (not filmed) ---------- */

async function createPhysicsTest(page) {
  await page.goto(`${BASE}/tests`);
  await page.getByRole("button", { name: "ახალი ტესტის შექმნა" }).first().click();
  await page.locator('[data-new-test-dialog] [data-subject="physics"]').click();
  await page.waitForURL((url) => url.pathname.startsWith("/editor/"));
  await editor(page).waitFor({ timeout: 60000 });
  await page.waitForTimeout(600);
}

async function sampleCopy(page) {
  await page.goto(`${BASE}/editor/sample-physics`);
  await page.locator("[data-sample-banner] button").click();
  await page.waitForURL((url) => url.pathname.startsWith("/editor/") && !url.pathname.includes("sample-"));
  await editor(page).waitFor({ timeout: 60000 });
  await page.waitForTimeout(800);
}

/** Adds a question of a type and writes its text (before filming). */
async function addQuestion(page, type, text) {
  await editor(page).locator(`[data-add-type="${type}"]`).click();
  const box = questionBox(lastCard(page));
  await box.click();
  if (text) await page.keyboard.type(text);
  await page.waitForTimeout(300);
}

/** Leaves any box (closes the toolbar) and scrolls a card into a calm position. */
async function settleOn(page, locator, place = 0.3) {
  await page.mouse.click(8, 400); // empty page margin
  await page.waitForTimeout(250);
  await locator.evaluate((el, p) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight * p }), place);
  await page.waitForTimeout(500);
}

const printReady = (page) => page.locator('[data-print-ready="true"]').first().waitFor({ timeout: 90000 });

/* ---------- scenes ---------- */

export const SCENES = [
  {
    id: "create",
    title: "ტესტის შექმნა",
    async setup(page) {
      await page.goto(`${BASE}/tests`);
      await page.getByRole("button", { name: "ნიმუშის გახსნა" }).first().waitFor();
      await page.waitForTimeout(800);
    },
    async run(d, page) {
      await d.wait(0.3);
      d.caption("მზა ნიმუში — ან ახალი ტესტი");
      await d.point(page.getByRole("button", { name: "ნიმუშის გახსნა" }).first(), 1.0);
      d.caption("დააჭირეთ „ახალი ტესტის შექმნა“");
      await d.click(page.getByRole("button", { name: "ახალი ტესტის შექმნა" }).first());
      const dialog = page.locator("[data-new-test-dialog]");
      await dialog.waitFor();
      await d.camera(dialog, { maxZoom: 1.4 });
      d.caption("აირჩიეთ საგანი — ფიზიკა");
      await d.wait(0.5);
      await d.click(dialog.locator('[data-subject="physics"]'), { reveal: false });
      await d.skip(async () => {
        await page.waitForURL((url) => url.pathname.startsWith("/editor/"));
        await editor(page).waitFor({ timeout: 60000 });
        await page.waitForTimeout(700);
      });
      await d.camera(null);
      d.caption("ტესტი მზადაა — ფიზიკის ხელსაწყოებით");
      d.mark();
      await d.wait(1.6);
    },
  },

  {
    id: "details",
    title: "ტესტის მონაცემები",
    async setup(page) {
      await createPhysicsTest(page);
      await settleOn(page, page.locator("[data-test-header]"), 0.12);
    },
    async run(d, page) {
      const header = page.locator("[data-test-header]");
      const title = page.locator("[data-title-input]");
      const grade = header.getByLabel("კლასი", { exact: true });
      await d.camera(grade, { pad: 210, maxZoom: 1.35 });
      d.caption("ჩაწერეთ სათაური და კლასი");
      await d.click(title, { reveal: false });
      await d.typeFast("ნიუტონის კანონები");
      await d.click(grade, { reveal: false });
      await d.typeFast("მე-9 კლასი");
      d.caption("თარიღი — ერთი დაწკაპუნებით");
      await d.click(header.getByRole("button", { name: "დღეს" }));
      await d.wait(0.4);
      const saved = page.getByText(/შენახულია/).first();
      await d.camera(null);
      d.caption("ყველაფერი თავისით ინახება");
      await d.point(saved, 0.3);
      d.spot(await d.box(saved), 1.4);
      d.mark();
      await d.wait(1.4);
    },
  },

  {
    id: "questions",
    title: "კითხვები და ქულები",
    async setup(page) {
      await createPhysicsTest(page);
      await settleOn(page, editor(page).locator('[data-add-type="multiple-choice"]'), 0.4);
    },
    async run(d, page) {
      const grid = editor(page).locator('[data-add-type="multiple-choice"]').locator("xpath=..");
      await d.camera(grid, { pad: 40, maxZoom: 1.4 });
      d.caption("აირჩიეთ კითხვის ტიპი");
      await d.wait(1.0);
      await d.click(editor(page).locator('[data-add-type="multiple-choice"]'), { reveal: false });
      const card = lastCard(page);
      await card.waitFor();
      // Points first: once the question box is focused, the symbol toolbar covers the card's header.
      await page.mouse.click(8, 400); // leave the new box: the toolbar closes
      const points = card.locator("label:has-text('ქულა') input").first();
      await d.reveal(points, { place: 0.45 });
      await d.camera(card, { pad: 30, maxZoom: 1.35 });
      d.caption("მიუთითეთ ქულა — ჯამი თავად ითვლება");
      await d.click(points, { reveal: false });
      await page.keyboard.press("Control+A");
      await d.type("3");
      await d.wait(0.3);
      const total = page.getByText(/სულ:\s*3\s*ქულა/).filter({ visible: true }).first();
      await d.camera(total, { pad: 160, maxZoom: 1.5 });
      d.spot(await d.box(total), 1.8);
      d.mark();
      await d.wait(1.9);
    },
  },

  {
    id: "formulas",
    title: "ფორმულები",
    async setup(page) {
      await createPhysicsTest(page);
      await addQuestion(page, "short-answer", "");
      await settleOn(page, lastCard(page), 0.42);
    },
    async run(d, page) {
      const box = questionBox(lastCard(page));
      await d.camera({ x: 300, y: 50, w: 840, h: 560 }, { maxZoom: 1.5 });
      d.caption("„ფორმულა“ ღილაკი ან Alt+=");
      await d.click(box, { reveal: false });
      await d.typeFast("გამოთვალეთ: ");
      await d.click(page.locator("[data-insert-formula]"), { reveal: false });
      d.caption("აირჩიეთ წილადი და შეავსეთ უჯრები");
      await d.click(toolbarButton(page, "წილადი"), { reveal: false });
      await d.type("3", { delay: 100 });
      await d.press("Tab");
      await d.type("4", { delay: 100 });
      await d.press("ArrowRight");
      await d.wait(0.5);
      d.caption("ან მოძებნეთ ნებისმიერი სიმბოლო");
      await d.click(page.locator("[data-symbol-search] input, input[data-symbol-search]").first(), { reveal: false });
      await d.typeFast("ფესვი", 2);
      await d.wait(0.7);
      await d.press("Enter");
      await d.wait(0.4);
      d.mark();
      await d.wait(1.2);
    },
  },

  {
    id: "physics",
    title: "ფიზიკის ხელსაწყოები",
    async setup(page) {
      await createPhysicsTest(page);
      await addQuestion(page, "short-answer", "");
      await settleOn(page, lastCard(page), 0.42);
      await questionBox(lastCard(page)).click();
      await page.keyboard.type("ავტომობილის სიჩქარეა 20 ");
      await page.waitForTimeout(500);
    },
    async run(d, page) {
      await d.camera({ x: 300, y: 50, w: 840, h: 560 }, { maxZoom: 1.5 });
      d.caption("ერთეულები ქართულად ან ლათინურად");
      await d.click(tab(page, "ერთეულები"), { reveal: false });
      const styles = toolbar(page).locator("[data-toolbar-styles] button");
      await d.click(styles.filter({ hasText: "Latin" }), { reveal: false });
      await d.wait(0.4);
      await d.click(styles.filter({ hasText: "ქართული" }), { reveal: false });
      await d.click(toolbarButton(page, "მეტრი წამში (სიჩქარე)"), { reveal: false });
      await d.press("ArrowRight");
      d.caption("ვექტორები, Δ და 10-ის ხარისხები");
      await d.click(tab(page, "ვექტორები, Δ, 10ⁿ"), { reveal: false });
      await d.wait(0.8);
      d.caption("მუდმივა: მაუსი აჩვენებს მნიშვნელობას");
      await d.click(tab(page, "მუდმივები"), { reveal: false });
      await d.point(toolbarButton(page, "სინათლის სიჩქარე"), 1.6);
      d.caption("28 მზა ფიზიკური ფორმულა");
      await d.click(tab(page, "ფორმულები"), { reveal: false });
      await d.click(toolbarButton(page, "ნიუტონის მეორე კანონი"), { reveal: false });
      await d.wait(0.3);
      d.mark();
      await d.wait(1.2);
    },
  },

  {
    id: "given-find",
    title: "ამოცანა: მოცემულია / საპოვნელია",
    async setup(page) {
      await createPhysicsTest(page);
      await settleOn(page, editor(page).locator('[data-add-type="given-find"]'), 0.4);
    },
    async run(d, page) {
      d.caption("ამოხსნის ჩარჩო, როგორც რვეულში");
      await d.click(editor(page).locator('[data-add-type="given-find"]'));
      const card = lastCard(page);
      await card.waitFor();
      await d.reveal(card, { place: 0.2 });
      await d.camera(card, { pad: 24, maxZoom: 1.3 });
      d.caption("ჩაწერეთ მოცემულობა და საპოვნელი");
      await d.click(card.locator("details summary"));
      const given = card.locator('[aria-label="მოცემულია"]');
      await given.waitFor();
      await d.reveal(given, { place: 0.45 });
      await d.camera(card.locator("details"), { pad: 24, maxZoom: 1.45 });
      await d.click(given, { reveal: false });
      await d.typeFast("s = 200 მ; t = 10 წმ");
      await d.click(card.locator('[aria-label="საპოვნელია"]'), { reveal: false });
      await d.typeFast("v — ?", 2);
      d.caption("ამოხსნა ჩანს მხოლოდ პასუხების ფურცელზე");
      await d.click(card.locator('[aria-label="ამოხსნა"]'), { reveal: false });
      await d.typeFast("v = s : t = 20 მ/წმ");
      d.spot(await d.box(card.locator("details summary")), 1.6);
      d.mark();
      await d.wait(1.7);
    },
  },

  {
    id: "circuit",
    title: "ელექტრული წრედი",
    async setup(page) {
      await createPhysicsTest(page);
      await addQuestion(page, "short-answer", "რას აჩვენებს ამპერმეტრი?");
      await settleOn(page, lastCard(page), 0.25);
    },
    async run(d, page) {
      const card = lastCard(page);
      d.caption("„ელექტრული წრედი“ — ნახაზი ბადეზე");
      await d.click(card.locator('[data-new-diagram="circuit"]'));
      const dialog = page.locator('[data-diagram-dialog="circuit"]');
      await dialog.waitFor();
      await d.wait(0.3);
      await d.camera(dialog, { pad: 16, maxZoom: 1.3 });
      d.caption("აირჩიეთ ნაწილი, დააწკაპუნეთ ადგილს");
      await d.click(dialog.locator('[data-tool="resistor"]'), { reveal: false });
      await d.click(dialog.locator('[data-gap="h:2:0"]'), { reveal: false });
      d.caption("R1 დაიბეჭდება როგორც R₁");
      await d.click(dialog.locator("[data-circuit-label]"), { reveal: false });
      await d.type("R1", { delay: 140 });
      await d.wait(0.6);
      d.caption("ჩასვით — ნახაზი კითხვაშია");
      await d.click(dialog.locator("[data-diagram-save]"), { reveal: false });
      await d.wait(0.3);
      await d.reveal(card, { place: 0.2 });
      await d.camera(card, { pad: 24, maxZoom: 1.3 });
      d.mark();
      await d.wait(1.6);
    },
  },

  {
    id: "forces",
    title: "ძალების ნახაზი",
    async setup(page) {
      await createPhysicsTest(page);
      await addQuestion(page, "short-answer", "დაასახელეთ სხეულზე მოქმედი ძალები.");
      await settleOn(page, lastCard(page), 0.25);
    },
    async run(d, page) {
      const card = lastCard(page);
      d.caption("აირჩიეთ სხეული და ზედაპირი");
      await d.click(card.locator('[data-new-diagram="forces"]'));
      const dialog = page.locator('[data-diagram-dialog="forces"]');
      await dialog.waitFor();
      await d.wait(0.3);
      await d.camera(dialog, { pad: 16, maxZoom: 1.3 });
      await d.click(dialog.getByRole("button", { name: "დახრილი სიბრტყე", exact: true }), { reveal: false });
      d.caption("ძალები თავად შემობრუნდება დახრილობით");
      await d.wait(1.4);
      d.caption("ხახუნის ძალა — ერთი დაწკაპუნებით");
      await d.click(dialog.locator('[data-preset="friction"]'), { reveal: false });
      await d.wait(1.0);
      await d.click(dialog.locator("[data-diagram-save]"), { reveal: false });
      await d.wait(0.3);
      await d.reveal(card, { place: 0.2 });
      await d.camera(card, { pad: 24, maxZoom: 1.3 });
      d.caption("ნახაზი კითხვაშია");
      d.mark();
      await d.wait(1.5);
    },
  },

  {
    id: "media",
    title: "სურათები და ბადე",
    async setup(page) {
      await createPhysicsTest(page);
      await addQuestion(page, "open-answer", "ააგეთ სიჩქარის დროზე დამოკიდებულების გრაფიკი.");
      await settleOn(page, lastCard(page), 0.2);
    },
    async run(d, page) {
      const card = lastCard(page);
      await d.camera(card, { pad: 24, maxZoom: 1.3 });
      d.caption("დაამატეთ სურათი — ან უბრალოდ ჩასვით");
      await d.point(card.getByRole("button", { name: "სურათის დამატება" }), 1.3);
      d.caption("ბადე ან კოორდინატთა სიბრტყე პასუხისთვის");
      await d.click(card.getByRole("button", { name: "კოორდინატთა სიბრტყე", exact: true }));
      await d.wait(0.5);
      await d.reveal(card.locator("svg").last(), { place: 0.35 });
      await d.camera(card, { pad: 24, maxZoom: 1.3 });
      d.mark();
      await d.wait(1.7);
    },
  },

  {
    id: "paper",
    title: "ქაღალდზე ნახვა",
    async setup(page) {
      await sampleCopy(page);
      await page.evaluate(() => window.scrollTo({ top: 0 }));
      await page.waitForTimeout(400);
    },
    async run(d, page) {
      d.caption("ნახეთ ნამდვილი ფურცელი აკრეფისას");
      await d.click(page.locator("[data-paper-view-toggle]").filter({ visible: true }).first(), { reveal: false });
      await d.wait(1.3);
      const first = questionBox(cards(page).first());
      await d.reveal(first, { place: 0.45 });
      await d.click(first, { reveal: false });
      await d.press("End");
      d.caption("ცვლილება მაშინვე ჩანს ქაღალდზე");
      await d.typeFast(" აირჩიეთ ერთი პასუხი.", 2);
      await d.wait(0.4);
      await d.camera(page.locator(".live-preview").filter({ visible: true }).first(), { pad: 10, maxZoom: 1.35 });
      d.mark();
      await d.wait(1.8);
    },
  },

  {
    id: "print",
    title: "ბეჭდვა და PDF",
    async setup(page) {
      await sampleCopy(page);
      await page.evaluate(() => window.scrollTo({ top: 0 }));
      await page.waitForTimeout(400);
    },
    async run(d, page) {
      d.caption("ბეჭდვა / PDF — ერთი ღილაკით");
      await d.click(page.locator("a, button", { hasText: "ბეჭდვა / PDF" }).filter({ visible: true }).first(), { reveal: false });
      await d.skip(async () => {
        await page.waitForURL((url) => url.pathname.startsWith("/print/"));
        await printReady(page);
        await page.waitForTimeout(600);
      });
      d.caption("მოსწავლის ფურცელი ან პასუხები");
      await d.click(segment(page, "პასუხები"), { reveal: false });
      await printReady(page);
      await d.camera({ x: 380, y: 300, w: 680, h: 500 }, { maxZoom: 1.5 });
      d.mark();
      await d.wait(1.6);
      await d.camera(null);
      d.caption("ერთი ან ორი სვეტი");
      await d.click(segment(page, "2 სვეტი"), { reveal: false });
      await printReady(page);
      await d.wait(1.2);
      d.caption("დაბეჭდეთ ან ჩამოტვირთეთ PDF");
      await d.click(page.getByRole("button", { name: /PDF-ის ჩამოტვირთვა/ }), { reveal: false });
      await d.wait(1.5);
    },
  },

  {
    id: "variants",
    title: "ვარიანტები",
    async setup(page) {
      await sampleCopy(page);
      await page.goto(page.url().replace("/editor/", "/print/"));
      await printReady(page);
      await page.waitForTimeout(600);
    },
    async run(d, page) {
      d.caption("6-მდე ვარიანტი, არეული კითხვებით");
      await d.click(segment(page, "3"), { reveal: false });
      await printReady(page);
      await d.click(segment(page, "II"), { reveal: false });
      await printReady(page);
      await d.camera({ x: 380, y: 330, w: 680, h: 470 }, { maxZoom: 1.5 });
      await d.wait(1.6);
      d.caption("თითოეულ ვარიანტს — თავისი პასუხები");
      await d.camera(null);
      await d.click(segment(page, "პასუხები"), { reveal: false });
      await printReady(page);
      d.mark();
      await d.wait(1.6);
    },
  },
];
