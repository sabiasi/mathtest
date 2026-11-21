/**
 * Records the tour's scenes from the running site.
 *
 *   npm run capture              → every scene
 *   npm run capture -- print     → only some scenes (by id), the others are kept
 *
 * Needs the site running (production build, see README.md) at TOUR_URL
 * (default http://localhost:3210). Uses the computer's installed Chrome.
 *
 * Writes: public/capture/<scene>/f00000.jpg … (frames) and src/data/capture.json
 * (frame times + cursor, clicks, highlights, captions, camera, cuts).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { Director, SCALE, VIEWPORT } from "./director.mjs";
import { BASE, SCENES } from "./scenes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data", "capture.json");
const only = process.argv.slice(2);

const unknown = only.filter((id) => !SCENES.some((s) => s.id === id));
if (unknown.length) throw new Error(`Unknown scene(s): ${unknown.join(", ")}. Known: ${SCENES.map((s) => s.id).join(", ")}`);

const saved = fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, "utf8")) : { scenes: {} };
const browser = await chromium.launch({ channel: "chrome", headless: true, args: [`--force-device-scale-factor=${SCALE}`] }); // without this flag the screencast sends 1× frames
let failed = false;

for (const scene of SCENES) {
  if (only.length && !only.includes(scene.id)) continue;
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, locale: "ka-GE", acceptDownloads: true, colorScheme: "light" });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  try {
    process.stdout.write(`${scene.id}: setting up… `);
    await scene.setup(page);
    const director = new Director(page, path.join(ROOT, "public", "capture", scene.id));
    await director.start();
    process.stdout.write("recording… ");
    await scene.run(director, page);
    const result = await director.stop();
    saved.scenes[scene.id] = { id: scene.id, title: scene.title, ...result };
    const cut = result.skips.reduce((sum, s) => sum + (s.t1 - s.t0) * (s.rate ? 1 - 1 / s.rate : 1), 0);
    console.log(`${(result.duration - cut).toFixed(1)} s, ${result.frames.length} frames`);
  } catch (error) {
    failed = true;
    console.log("FAILED");
    console.error(error);
    await page.screenshot({ path: path.join(ROOT, "out", `failed-${scene.id}.png`) }).catch(() => {});
  } finally {
    await context.close();
  }
}
await browser.close();

saved.order = SCENES.map((s) => s.id);
saved.titles = Object.fromEntries(SCENES.map((s) => [s.id, s.title]));
saved.base = BASE;
fs.mkdirSync(path.dirname(DATA), { recursive: true });
fs.writeFileSync(DATA, JSON.stringify(saved));
if (failed) process.exitCode = 1;
