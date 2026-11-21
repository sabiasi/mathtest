/**
 * Renders check stills (PNG) into out/stills/: the intro, every title card, the middle of
 * every caption of every scene, and the recap. Used to verify the video before/after a
 * full render: is the caption readable, the highlight on the right thing, nothing cut off?
 *
 *   npm run stills              → all
 *   npm run stills -- circuit   → one scene
 *
 * The timing below mirrors src/timeline.ts (keep FOOTAGE_SPEED etc. in sync).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out", "stills");
const only = process.argv[2];

const timeline = fs.readFileSync(path.join(ROOT, "src", "timeline.ts"), "utf8");
const num = (name) => Number(timeline.match(new RegExp(`export const ${name} = ([\\d.]+)`))[1]);
const [FPS, SPEED, INTRO, TITLE, FADE] = ["FPS", "FOOTAGE_SPEED", "INTRO", "TITLE", "FADE"].map(num);

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "capture.json"), "utf8"));
const scenes = data.order.map((id) => data.scenes[id]).filter(Boolean);

/** Source time → video seconds from the footage start (same pieces as timeline.ts). */
function toOut(scene, src) {
  const marks = [...scene.skips].sort((a, b) => a.t0 - b.t0);
  let out = 0;
  let at = 0;
  const advance = (until, rate) => {
    const end = Math.min(until, src);
    if (end > at) out += rate === 0 ? 0 : (end - at) / (rate * SPEED);
    at = Math.max(at, until);
  };
  for (const m of marks) {
    advance(m.t0, 1);
    advance(m.t1, m.rate);
  }
  advance(scene.duration, 1);
  return out;
}

const shots = [{ name: "00-intro", t: 2.5 }];
let start = INTRO - FADE;
scenes.forEach((scene, i) => {
  const n = String(i + 1).padStart(2, "0");
  const footageStart = start + TITLE - FADE;
  shots.push({ name: `${n}-${scene.id}-title`, t: start + TITLE / 2, scene: scene.id });
  scene.captions.forEach((c, k) => {
    const mid = (c.t0 + Math.min(c.t1, scene.duration)) / 2;
    shots.push({ name: `${n}-${scene.id}-cap${k + 1}`, t: footageStart + toOut(scene, mid), scene: scene.id });
  });
  start = footageStart + toOut(scene, scene.duration) - FADE;
});
shots.push({ name: "99-recap", t: start + 4 });

const wanted = shots.filter((s) => !only || s.scene === only || (only === "cards" && !s.scene));
fs.mkdirSync(OUT, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src", "index.ts") });
const composition = await selectComposition({ serveUrl, id: "Tour" });
for (const shot of wanted) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(shot.t * FPS));
  await renderStill({ serveUrl, composition, frame, output: path.join(OUT, `${shot.name}.png`), scale: 0.5 });
  console.log(`${shot.name}  @${(frame / FPS).toFixed(1)}s`);
}
