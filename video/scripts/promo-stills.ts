/**
 * Check pictures of the promo video (PNG, half size) in out/promo-stills/: the intro, each title
 * card, five moments of each scene's footage and the outro. Look at them before a full render.
 *
 *   npm run stills:promo            → all
 *   npm run stills:promo -- math    → one scene
 */
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { INTRO, OUTRO, TITLE, promoLayout } from "../src/promo/timeline";
import { FPS } from "../src/timeline";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "out", "promo-stills");
const only = process.argv[2];

const { placed, outroStart } = promoLayout();
const shots: { name: string; t: number; scene?: string }[] = [{ name: "00-intro", t: INTRO * 0.75 }];
for (const p of placed) {
  const n = String(p.index + 1).padStart(2, "0");
  shots.push({ name: `${n}-${p.scene.id}-0title`, t: p.start + TITLE / 2, scene: p.scene.id });
  [0.12, 0.32, 0.52, 0.72, 0.93].forEach((share, k) => shots.push({ name: `${n}-${p.scene.id}-${k + 1}`, t: p.footageStart + p.footage * share, scene: p.scene.id }));
}
shots.push({ name: "99-outro", t: outroStart + OUTRO * 0.7 });

fs.mkdirSync(OUT, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src", "index.ts") });
const composition = await selectComposition({ serveUrl, id: "Promo" });
console.log(`Promo: ${(composition.durationInFrames / FPS).toFixed(1)} s`);
for (const shot of shots.filter((s) => !only || s.scene === only)) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(shot.t * FPS));
  await renderStill({ serveUrl, composition, frame, output: path.join(OUT, `${shot.name}.png`), scale: 0.5 });
  console.log(`${shot.name}  @${(frame / FPS).toFixed(1)}s`);
}
