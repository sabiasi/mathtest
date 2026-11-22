/**
 * Records the tour's scenes from the running site.
 *
 *   npm run capture              → every scene of the physics tour
 *   npm run capture -- print     → only some scenes (by id), the others are kept
 *   npm run capture:promo [ids]  → the promo video (same, with `--video promo`)
 *
 * Needs the site running (production build, see README.md) at TOUR_URL
 * (default http://localhost:3210). Uses the computer's installed Chrome.
 *
 * Writes: public/<dir>/<scene>/f00000.jpg … (frames) and src/data/<data>.json
 * (frame times + cursor, clicks, highlights, captions, camera, cuts).
 * Tour: dir "capture", data "capture.json"; promo: dir "promo", data "promo.json".
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { Director, SCALE, VIEWPORT } from "./director.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const videoAt = args.indexOf("--video");
const video = videoAt >= 0 ? args.splice(videoAt, 2)[1] : "tour";
const VIDEOS = {
  tour: { scenes: "./scenes.mjs", data: "capture.json", dir: "capture" },
  promo: { scenes: "./promo-scenes.mjs", data: "promo.json", dir: "promo" },
};
if (!VIDEOS[video]) throw new Error(`Unknown video "${video}". Known: ${Object.keys(VIDEOS).join(", ")}`);
const { BASE, SCENES } = await import(VIDEOS[video].scenes);
const DATA = path.join(ROOT, "src", "data", VIDEOS[video].data);
const DIR = VIDEOS[video].dir;
const only = args;

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
    const director = new Director(page, path.join(ROOT, "public", DIR, scene.id));
    await director.start();
    process.stdout.write("recording… ");
    await scene.run(director, page);
    const result = await director.stop();
    saved.scenes[scene.id] = { id: scene.id, title: scene.title, dir: DIR, ...(scene.accent ? { accent: scene.accent } : {}), ...result };
    const cut = result.skips.reduce((sum, s) => sum + (s.t1 - s.t0) * (s.rate ? 1 - 1 / s.rate : 1), 0);
    console.log(`${(result.duration - cut).toFixed(1)} s, ${result.frames.length} frames`);
  } catch (error) {
    failed = true;
    console.log("FAILED");
    console.error(error);
    fs.mkdirSync(path.join(ROOT, "out"), { recursive: true });
    await page.screenshot({ path: path.join(ROOT, "out", `failed-${video}-${scene.id}.png`) }).catch(() => {});
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
