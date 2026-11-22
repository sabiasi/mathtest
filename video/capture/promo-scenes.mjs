/**
 * The promo video's scenes, in order (see ../promo-storyboard.md).
 *
 * Same Director as the physics tour (director.mjs), but:
 *  - NO captions (subtitles and a voice are added later by the owner),
 *  - a made-up signed-in teacher (account.mjs) instead of a guest,
 *  - `accent` = the subject colour of the scene's title card.
 *
 * Every scene runs in a fresh browser. Re-record one with `npm run capture:promo -- <id>`.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { teacher } from "./account.mjs";

export const BASE = process.env.TOUR_URL ?? "http://localhost:3210";
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "out");

const EDITOR = '[data-editor-ready="true"]:visible';
const editor = (page) => page.locator(EDITOR);
const cards = (page) => editor(page).locator("[data-question-card]");
const lastCard = (page) => cards(page).last();
const questionBox = (card) => card.locator(".rich-text-input .ProseMirror").first();
const toolbar = (page) => editor(page).locator("[data-math-toolbar]");
const toolbarButton = (page, label) => toolbar(page).locator(`button[aria-label^="${label}"]`).first();
const tab = (page, name) => toolbar(page).getByRole("tab", { name, exact: true });
const segment = (page, name) => page.locator("main [role=group] button", { hasText: new RegExp(`^${name}$`) }).first();
const printReady = (page) => page.locator('[data-print-ready="true"]').first().waitFor({ timeout: 90000 });

/* ---------- setup helpers (not filmed) ---------- */

/** Waits until the little messages ("A new test was created") have gone. */
async function noToasts(page) {
  await page.waitForTimeout(600);
  await page.waitForFunction(() => document.querySelectorAll("[data-sonner-toast]").length === 0, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300);
}

/** Scrolls something into view inside a scrolling window (smoothly) and returns it. */
async function inView(locator) {
  await locator.evaluate((el) => el.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  await new Promise((r) => setTimeout(r, 450));
  return locator;
}

/** Makes Chrome paint once more (the screencast only sends a frame when something is painted). */
const repaint = (page) =>
  page.evaluate(
    () =>
      new Promise((done) => {
        document.body.style.opacity = "0.999";
        requestAnimationFrame(() => requestAnimationFrame(() => {
          document.body.style.opacity = "";
          requestAnimationFrame(() => done());
        }));
      }),
  );

/** The site's own pop-up about this very video must not appear in it (it shows on every visit). */
async function noPromoCard(page) {
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "[data-promo-card] { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
  });
}

async function signedInTeacher(page, options = {}) {
  await noPromoCard(page);
  return teacher(page, BASE, options);
}

/** A new, empty test of a subject, made through "New test" → "Which subject?". */
async function newTest(page, subject) {
  await page.goto(`${BASE}/tests`);
  await page.getByRole("button", { name: "ახალი ტესტის შექმნა" }).first().click();
  await page.locator(`[data-new-test-dialog] [data-subject="${subject}"]`).click();
  await page.waitForURL((url) => url.pathname.startsWith("/editor/"));
  await editor(page).waitFor({ timeout: 60000 });
  await noToasts(page);
}

/** An editable copy of a subject's sample test ("Use as template"); retried until the account has loaded. */
async function sampleCopy(page, subject) {
  await page.goto(`${BASE}/editor/sample-${subject}`);
  for (let i = 0; i < 40 && page.url().includes("sample-"); i++) {
    await page.locator("[data-sample-banner] button").click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(700);
  }
  if (page.url().includes("sample-")) throw new Error(`"Use as template" did not open a copy of the ${subject} sample`);
  await editor(page).waitFor({ timeout: 60000 });
  await noToasts(page);
}

async function addQuestion(page, type, text) {
  await editor(page).locator(`[data-add-type="${type}"]`).click();
  const box = questionBox(lastCard(page));
  await box.click();
  if (text) await page.keyboard.type(text);
  await page.waitForTimeout(300);
}

/** Leaves any box (closes the toolbar) and scrolls something into a calm position. */
async function settleOn(page, locator, place = 0.3) {
  await page.mouse.click(8, 400); // empty page margin
  await page.waitForTimeout(250);
  await locator.evaluate((el, p) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight * p }), place);
  await page.waitForTimeout(500);
}

/**
 * Tests for a teacher who has used Rapido for a while ("My tests" and later scenes).
 * Made once from the samples (through the real app) and kept in out/promo-seed.json.
 */
const SEED = path.join(OUT, "promo-seed.json");
async function seedTests(page) {
  if (fs.existsSync(SEED)) return JSON.parse(fs.readFileSync(SEED, "utf8"));
  // Its own window, so nothing of this is left in the scene's page.
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 810 }, locale: "ka-GE", colorScheme: "light" });
  const helper = await context.newPage();
  helper.setDefaultTimeout(30000);
  const account = await signedInTeacher(helper, { subjects: ["math"] });
  for (const subject of ["math", "physics", "chemistry", "english", "geography", "history"]) await sampleCopy(helper, subject);
  await context.close();
  const made = account.tests.map((row) => row.data);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(SEED, JSON.stringify(made));
  return made;
}

/** The seed plus more maths tests in two folders, edited at different times. */
function libraryFrom(seed) {
  const math = seed.find((t) => t.subjectId === "math");
  const hour = 3600 * 1000;
  const now = Date.now();
  const more = [
    ["წრფივი განტოლებები", "მე-7 კლასი", "I სემესტრი", 30],
    ["კვადრატული განტოლებები", "მე-8 კლასი", "I სემესტრი", 54],
    ["ფუნქციები და გრაფიკები", "მე-9 კლასი", "II სემესტრი", 6],
    ["ტრიგონომეტრია", "მე-10 კლასი", "II სემესტრი", 3],
    ["ალბათობა და სტატისტიკა", "მე-8 კლასი", "", 75],
  ].map(([title, grade, folder, hoursAgo]) => ({
    ...structuredClone(math),
    id: randomUUID(),
    title,
    grade,
    folder,
    createdAt: new Date(now - (hoursAgo + 200) * hour).toISOString(),
    updatedAt: new Date(now - hoursAgo * hour).toISOString(),
  }));
  return [...seed.map((t, i) => ({ ...t, updatedAt: new Date(now - (i + 1) * 20 * hour).toISOString() })), ...more];
}

/* ---------- pace ---------- */

/**
 * The promo's calm tempo (the owner: "normal tempo, so teachers can follow, and a voice can
 * be added"). Applied to every scene below, on top of what each scene asks for:
 *  - the cursor travels for `move` seconds and rests on a button for at least `dwell`
 *    (while its highlight shows) before clicking, then waits `after`,
 *  - typing is fast-forwarded at most `typing` times,
 *  - every hold (`wait`, `point`) lasts `hold` times longer.
 * The overall playback speed is PROMO_SPEED in src/promo/timeline.ts (no new recording needed).
 */
const PACE = { move: 0.85, dwell: 0.8, after: 0.5, typing: 1, hold: 1.8 };

function calm(d) {
  d.moveSeconds = PACE.move;
  return new Proxy(d, {
    get(target, prop) {
      if (prop === "click")
        return (locator, o = {}) =>
          target.click(locator, { ...o, dwell: Math.max(o.dwell ?? 0.3, PACE.dwell), after: o.after === 0 ? 0 : Math.max(o.after ?? 0.25, PACE.after) });
      if (prop === "fast") return (fn, rate = 3) => target.fast(fn, Math.min(rate, PACE.typing));
      if (prop === "typeFast") return (text, rate = 3) => target.typeFast(text, Math.min(rate, PACE.typing));
      if (prop === "wait") return (seconds) => target.wait(seconds * PACE.hold);
      if (prop === "point") return (locator, seconds = 1.2) => target.point(locator, seconds * PACE.hold);
      const value = target[prop];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

/* ---------- scenes ---------- */

const SCENE_LIST = [
  {
    id: "signup",
    title: "რეგისტრაცია — ერთი დაწკაპუნებით",
    async setup(page) {
      page.account = await signedInTeacher(page, { signedIn: false, subjects: null });
      await page.goto(`${BASE}/`);
      await page.getByRole("link", { name: "რეგისტრაცია" }).first().waitFor();
      await page.waitForTimeout(1500); // the hero's fade-in
    },
    async run(d, page) {
      await d.wait(0.8);
      d.mark();
      await d.click(page.locator("header").getByRole("link", { name: "რეგისტრაცია" }), { reveal: false, dwell: 0.4, after: 0 });
      const google = page.getByRole("button", { name: /Google/ });
      await d.skip(async () => {
        await page.waitForURL((url) => url.pathname.startsWith("/signup"));
        await google.waitFor();
        await page.waitForTimeout(500);
      });
      await d.camera(page.locator("main form").first(), { pad: 60, maxZoom: 1.35 });
      await d.wait(0.5);
      await d.click(google, { reveal: false, dwell: 0.6 });
      await d.skip(async () => {
        await page.locator("[data-account]").waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        await repaint(page); // a still page sends no new frame by itself
        await page.waitForTimeout(200);
      });
      await d.camera(page.locator(".card"), { pad: 80, maxZoom: 1.4 });
      await d.wait(0.6);
      await page.account.signInNow();
      await d.click(page.locator("[data-account]"), { reveal: false, dwell: 0.5, after: 0 });
      await d.skip(async () => {
        await page.waitForURL((url) => url.pathname.startsWith("/tests"));
        await page.locator("[data-teaching-dialog]").waitFor({ timeout: 60000 });
        await page.waitForTimeout(700);
      });
      await d.camera(null);
      await d.wait(1.2);
    },
  },

  {
    id: "subjects",
    title: "აირჩიეთ თქვენი საგანი",
    async setup(page) {
      await signedInTeacher(page, { subjects: null });
      await page.goto(`${BASE}/tests`);
      await page.locator("[data-teaching-dialog]").waitFor({ timeout: 60000 });
      await page.waitForTimeout(900);
    },
    async run(d, page) {
      const dialog = page.locator("[data-teaching-dialog]");
      await d.camera(dialog, { pad: 30, maxZoom: 1.35 });
      await d.wait(0.9);
      await d.click(dialog.locator('[data-teaching-subject="math"]'), { reveal: false, dwell: 0.4 });
      await d.wait(0.6);
      d.mark();
      await d.click(dialog.getByRole("button", { name: "შენახვა", exact: true }), { reveal: false });
      await d.wait(0.4);
      await d.camera(null);
      await d.wait(1.4);
    },
  },

  {
    id: "mytests",
    title: "ჩემი ტესტები — თქვენი სამუშაო მაგიდა",
    async setup(page) {
      const seed = await seedTests(page);
      await signedInTeacher(page, { subjects: ["math"], tests: libraryFrom(seed) });
      await page.goto(`${BASE}/tests`);
      await page.locator("[data-test-card]").first().waitFor({ timeout: 60000 }).catch(() => page.getByText("ალგებრა და გეომეტრია").first().waitFor());
      await page.waitForTimeout(1200);
    },
    async run(d, page) {
      await d.wait(0.6);
      const nav = page.locator("main nav, main aside").filter({ hasText: "ყველა ტესტი" }).first();
      d.spot(await d.box(nav), 1.6);
      await d.wait(1.6);
      await d.click(nav.getByText("მათემატიკა", { exact: true }).first(), { reveal: false });
      await d.wait(1.2);
      d.mark();
      const folder = page.locator("main").getByRole("button", { name: /I სემესტრი/ }).first();
      await d.click(folder, { reveal: false });
      await d.wait(1.2);
      await d.click(page.locator("main").getByRole("button", { name: /II სემესტრი/ }).first(), { reveal: false });
      await d.wait(1.0);
      await d.point(page.locator("main").getByRole("button", { name: /^ახალი ტესტი/ }).first(), 1.0);
    },
  },

  {
    id: "math",
    title: "მათემატიკა — ფორმულები ღილაკებით",
    accent: "math",
    async setup(page) {
      await signedInTeacher(page, { subjects: ["math"] });
      await page.goto(`${BASE}/tests`);
      await page.getByRole("button", { name: "ახალი ტესტის შექმნა" }).first().waitFor({ timeout: 60000 });
      await page.waitForTimeout(800);
    },
    async run(d, page) {
      await d.click(page.getByRole("button", { name: "ახალი ტესტის შექმნა" }).first(), { reveal: false });
      const dialog = page.locator("[data-new-test-dialog]");
      await dialog.waitFor();
      await d.camera(dialog, { maxZoom: 1.3 });
      await d.wait(0.3);
      await d.click(dialog.locator('[data-subject="math"]'), { reveal: false, after: 0 });
      await d.skip(async () => {
        await page.waitForURL((url) => url.pathname.startsWith("/editor/"));
        await editor(page).waitFor({ timeout: 60000 });
        await page.waitForTimeout(700);
      });
      await d.camera(null);
      const add = editor(page).locator('[data-add-type="multiple-choice"]');
      await d.click(add, { dwell: 0.3 });
      const card = lastCard(page);
      await card.waitFor();
      const box = questionBox(card);
      await d.reveal(box, { place: 0.55 });
      await d.click(box, { reveal: false, dwell: 0.2 });
      await d.typeFast("ამოხსენით განტოლება: ", 4);
      await d.camera({ x: 260, y: 40, w: 920, h: 520 }, { maxZoom: 1.5 });
      const formula = page.locator("[data-insert-formula]").filter({ visible: true }).first();
      await d.click(formula, { reveal: false, dwell: 0.9 });
      await d.click(toolbarButton(page, "წილადი"), { reveal: false, dwell: 0.4 });
      await d.type("x", { delay: 120 });
      await d.press("Tab");
      await d.type("2", { delay: 120 });
      await d.press("ArrowRight");
      await d.type("+3=7", { delay: 110 });
      await d.press("ArrowRight");
      await d.wait(0.8);
      d.mark();
      // The symbol list: a quick look through some of the tabs.
      await d.camera(toolbar(page), { pad: 20, maxZoom: 1.45 });
      for (const name of ["ტრიგონომეტრია", "ფუნქციები და ანალიზი", "ბერძნული ასოები"]) {
        await d.click(tab(page, name), { reveal: false, dwell: 0.15, after: 0.1 });
        await d.wait(0.75);
      }
      await d.click(tab(page, "ძირითადი"), { reveal: false, dwell: 0.15, after: 0.1 });
      // The answers (fast-forwarded).
      await d.camera(null);
      const options = card.locator(".rich-text-input .ProseMirror");
      const answers = ["4", "8", "10", "20"];
      for (let i = 0; i < 4; i++) {
        const option = options.nth(i + 1);
        await d.reveal(option, { place: 0.6 });
        await d.fast(async () => {
          await option.click();
          await page.keyboard.type(answers[i], { delay: 40 });
        }, 3);
      }
      await d.click(card.getByRole("button", { name: /მონიშნეთ ბ როგორც სწორი პასუხი/ }).or(card.locator('[aria-label*="როგორც სწორი პასუხი"]').nth(1)).first(), { reveal: false });
      await d.wait(0.4);
      await page.mouse.click(8, 400);
      await d.camera(card, { pad: 24, maxZoom: 1.3 });
      await d.wait(1.6);
    },
  },

  {
    id: "geometry",
    title: "გეომეტრიული ფიგურები",
    accent: "math",
    async setup(page) {
      await signedInTeacher(page, { subjects: ["math"] });
      await newTest(page, "math");
      await addQuestion(page, "open-answer", "მართკუთხა სამკუთხედის კათეტებია 5 სმ და 12 სმ. იპოვეთ ჰიპოტენუზა x.");
      await settleOn(page, lastCard(page), 0.2);
    },
    async run(d, page) {
      const card = lastCard(page);
      await d.click(card.locator('[data-new-diagram="geometry"]'), { dwell: 0.5 });
      const dialog = page.locator("[data-diagram-dialog=geometry]");
      await dialog.waitFor();
      await d.wait(0.3);
      await d.camera(dialog, { pad: 16, maxZoom: 1.3 });
      await d.wait(0.5);
      for (const shape of ["hexagon"]) {
        const button = dialog.locator(`[data-geometry-shape="${shape}"]`);
        if (await button.count()) {
          await d.click(button, { reveal: false, dwell: 0.15, after: 0.1 });
          await d.wait(0.55);
        }
      }
      await d.click(dialog.locator('[data-geometry-shape="triangle"]'), { reveal: false, dwell: 0.15 });
      // The window scrolls inside itself: bring each control into view before clicking it.
      await d.click(await inView(dialog.locator('[data-geometry-triangle="right"]')), { reveal: false, dwell: 0.2 });
      await d.click(await inView(dialog.locator("[data-geometry-labels]")), { reveal: false, dwell: 0.2 });
      // Right angle at C: the legs are CA and BC, the hypotenuse AB is x.
      for (const [side, text] of [["2", "5 სმ"], ["1", "12 სმ"], ["0", "x"]]) {
        const input = dialog.locator(`[data-geometry-side="${side}"]`);
        if (!(await input.count())) continue;
        await d.click(await inView(input), { reveal: false, dwell: 0.1, after: 0.05 });
        await d.fast(() => page.keyboard.type(text, { delay: 50 }), 2.5);
      }
      await d.camera(dialog.locator("[data-geometry-preview]"), { pad: 40, maxZoom: 1.5 });
      await d.wait(0.6);
      d.mark();
      await d.camera(null);
      await d.click(await inView(dialog.locator("[data-diagram-save]")), { reveal: false });
      await d.wait(0.3);
      await d.reveal(card, { place: 0.2 });
      await d.camera(card, { pad: 24, maxZoom: 1.3 });
      await d.wait(1.6);
    },
  },

  {
    id: "physics",
    title: "ფიზიკა — წრედები და ძალების ნახაზი",
    accent: "physics",
    async setup(page) {
      await signedInTeacher(page, { subjects: ["math"] });
      await newTest(page, "physics");
      await addQuestion(page, "open-answer", "იპოვეთ წრედის სრული წინაღობა.");
      await addQuestion(page, "open-answer", "დაასახელეთ სხეულზე მოქმედი ძალები.");
      await settleOn(page, cards(page).first(), 0.22);
    },
    async run(d, page) {
      const first = cards(page).first();
      await d.click(first.locator('[data-new-diagram="circuit"]'), { dwell: 0.5 });
      const circuit = page.locator('[data-diagram-dialog="circuit"]');
      await circuit.waitFor();
      await d.wait(0.3);
      await d.camera(circuit, { pad: 16, maxZoom: 1.3 });
      await d.click(circuit.locator('[data-tool="resistor"]'), { reveal: false });
      await d.click(circuit.locator('[data-gap="h:2:0"]'), { reveal: false });
      await d.click(circuit.locator("[data-circuit-label]"), { reveal: false });
      await d.type("R1", { delay: 120 });
      await d.click(circuit.locator('[data-tool="lamp"]'), { reveal: false });
      const gaps = circuit.locator("[data-gap]");
      const lampGap = circuit.locator('[data-gap="v:4:1"]');
      await d.click((await lampGap.count()) ? lampGap : gaps.nth(5), { reveal: false });
      await d.wait(0.6);
      d.mark();
      await d.click(circuit.locator("[data-diagram-save]"), { reveal: false });
      await d.wait(0.3);
      await d.camera(null);
      const second = cards(page).nth(1);
      await d.click(second.locator('[data-new-diagram="forces"]'), { dwell: 0.4 });
      const forces = page.locator('[data-diagram-dialog="forces"]');
      await forces.waitFor();
      await d.wait(0.3);
      await d.camera(forces, { pad: 16, maxZoom: 1.3 });
      await d.click(forces.getByRole("button", { name: "დახრილი სიბრტყე", exact: true }), { reveal: false });
      await d.wait(1.0);
      await d.click(forces.locator('[data-preset="friction"]'), { reveal: false });
      await d.wait(0.9);
      await d.click(forces.locator("[data-diagram-save]"), { reveal: false });
      await d.wait(0.3);
      await d.camera(null);
      await d.reveal(cards(page).first(), { place: 0.12 });
      await d.wait(0.3);
      await d.scrollBy(380);
      await d.wait(1.4);
    },
  },

  {
    id: "chemistry",
    title: "ქიმია — ფორმულები და მენდელეევის ცხრილი",
    accent: "chemistry",
    async setup(page) {
      await signedInTeacher(page, { subjects: ["math"] });
      await newTest(page, "chemistry");
      await addQuestion(page, "open-answer", "");
      await settleOn(page, lastCard(page), 0.42);
    },
    async run(d, page) {
      const card = lastCard(page);
      const box = questionBox(card);
      await d.camera({ x: 260, y: 40, w: 920, h: 520 }, { maxZoom: 1.5 });
      await d.click(box, { reveal: false });
      await d.typeFast("დაწერეთ რეაქციის ტოლობა: ", 4);
      await d.click(page.locator("[data-insert-chem]").filter({ visible: true }).first(), { reveal: false, dwell: 0.8 });
      await d.type("2", { delay: 120 });
      await d.click(page.locator("[data-periodic-open]").filter({ visible: true }).first(), { reveal: false, dwell: 0.5 });
      const table = page.locator("[data-periodic-table]");
      await table.waitFor();
      await d.wait(0.3);
      await d.camera(table, { pad: 10, maxZoom: 1.25 });
      await d.wait(0.6);
      for (const symbol of ["Fe", "Au"]) {
        await d.point(table.locator(`[data-element="${symbol}"]`), 0.45);
      }
      await d.click(table.locator('[data-element="Na"]'), { reveal: false, dwell: 0.4 });
      await d.wait(0.3);
      if (await table.isVisible()) await page.keyboard.press("Escape");
      await d.camera({ x: 260, y: 40, w: 920, h: 520 }, { maxZoom: 1.5 });
      await d.wait(0.3);
      await d.type(" + Cl2 -> 2NaCl", { delay: 95 });
      await d.wait(0.5);
      await d.press("Enter");
      await d.wait(0.3);
      await page.mouse.click(8, 400);
      await d.camera(card, { pad: 24, maxZoom: 1.35 });
      d.mark();
      await d.wait(1.8);
    },
  },

  {
    id: "english",
    title: "ინგლისური — კროსვორდი წამებში",
    accent: "english",
    async setup(page) {
      await signedInTeacher(page, { subjects: ["math"] });
      await newTest(page, "english");
      await settleOn(page, editor(page).locator('[data-add-type="crossword"]'), 0.4);
    },
    async run(d, page) {
      await d.click(editor(page).locator('[data-add-type="crossword"]'), { dwell: 0.5 });
      const card = lastCard(page);
      const crossword = card.locator("[data-crossword-editor]");
      await crossword.waitFor();
      await page.mouse.click(8, 400);
      await d.reveal(crossword, { place: 0.2 });
      await d.camera(card, { pad: 20, maxZoom: 1.3 });
      const words = [
        ["TRAIN", "It runs on rails."],
        ["TICKET", "You buy it before a trip."],
        ["PLANE", "It flies in the sky."],
        ["HOTEL", "You sleep here on holiday."],
      ];
      for (let i = 0; i < words.length; i++) {
        const entries = crossword.locator("[data-crossword-entry]");
        if ((await entries.count()) <= i) await d.click(crossword.getByRole("button", { name: /სიტყვის დამატება|დაამატეთ სიტყვა|Add a word/ }).first(), { reveal: false, dwell: 0.1, after: 0.1 });
        const entry = crossword.locator("[data-crossword-entry]").nth(i);
        await d.fast(async () => {
          await entry.locator("input").first().fill("");
          await entry.locator("input").first().click();
          await page.keyboard.type(words[i][0], { delay: 40 });
          await entry.locator("input").nth(1).click();
          await page.keyboard.type(words[i][1], { delay: 25 });
        }, 4);
      }
      await d.wait(0.4);
      const preview = card.locator(".paper").last();
      await d.reveal(preview, { place: 0.35 });
      await d.camera(card.locator("[data-crossword-editor]"), { pad: 20, maxZoom: 1.3 });
      await d.wait(0.8);
      d.mark();
      await d.click(crossword.locator("[data-new-layout]"), { reveal: false });
      await d.wait(0.9);
      await d.click(crossword.locator("[data-new-layout]"), { reveal: false });
      await d.wait(1.3);
    },
  },

  {
    id: "paper",
    title: "წერთ — და მაშინვე ხედავთ ფურცელზე",
    async setup(page) {
      await signedInTeacher(page, { subjects: ["math"] });
      await sampleCopy(page, "math");
      await page.evaluate(() => window.scrollTo({ top: 0 }));
      await page.waitForTimeout(400);
    },
    async run(d, page) {
      await d.click(page.locator("[data-paper-view-toggle]").filter({ visible: true }).first(), { reveal: false, dwell: 0.6 });
      await d.wait(1.4);
      const first = questionBox(cards(page).first());
      await d.reveal(first, { place: 0.5 });
      await d.click(first, { reveal: false });
      await d.press("Meta+ArrowDown");
      await d.typeFast(" პასუხი დაასაბუთეთ.", 2.5);
      await d.wait(0.2);
      await d.click(page.locator("[data-insert-formula]").filter({ visible: true }).first(), { reveal: false, dwell: 0.3 });
      await d.click(toolbarButton(page, "კვადრატული ფესვი"), { reveal: false, dwell: 0.2 });
      await d.type("49", { delay: 130 });
      await d.press("ArrowRight");
      await d.wait(0.5);
      await d.camera(page.locator(".live-preview").filter({ visible: true }).first(), { pad: 10, maxZoom: 1.35 });
      d.mark();
      await d.wait(2.0);
    },
  },

  {
    id: "print",
    title: "ბეჭდვა, PDF და ვარიანტები",
    async setup(page) {
      await signedInTeacher(page, { subjects: ["math"] });
      await sampleCopy(page, "math");
      await page.evaluate(() => window.scrollTo({ top: 0 }));
      await page.waitForTimeout(400);
    },
    async run(d, page) {
      await d.click(page.locator("a, button", { hasText: "ბეჭდვა / PDF" }).filter({ visible: true }).first(), { reveal: false, dwell: 0.5, after: 0 });
      await d.skip(async () => {
        await page.waitForURL((url) => url.pathname.startsWith("/print/"));
        await printReady(page);
        await page.waitForTimeout(600);
      });
      await d.wait(0.6);
      // Variants: 3, then variant II (shuffled).
      await d.click(segment(page, "3"), { reveal: false });
      await printReady(page);
      await d.wait(0.4);
      await d.click(segment(page, "II"), { reveal: false });
      await printReady(page);
      await d.camera({ x: 380, y: 330, w: 680, h: 470 }, { maxZoom: 1.5 });
      await d.wait(1.6);
      await d.camera(null);
      // Its answer key.
      await d.click(segment(page, "პასუხები"), { reveal: false });
      await printReady(page);
      await d.camera({ x: 380, y: 300, w: 680, h: 500 }, { maxZoom: 1.5 });
      d.mark();
      await d.wait(1.8);
      await d.camera(null);
      // All variants together: the answer table comes first.
      await d.click(segment(page, "ყველა"), { reveal: false });
      await printReady(page);
      await d.camera({ x: 380, y: 300, w: 680, h: 500 }, { maxZoom: 1.45 });
      await d.wait(1.8);
      await d.camera(null);
      await d.click(page.getByRole("button", { name: /PDF-ის ჩამოტვირთვა/ }), { reveal: false, dwell: 0.6 });
      await d.wait(1.6);
    },
  },
];

/** Every scene, played at the calm pace. */
export const SCENES = SCENE_LIST.map((scene) => ({ ...scene, run: (d, page) => scene.run(calm(d), page) }));
