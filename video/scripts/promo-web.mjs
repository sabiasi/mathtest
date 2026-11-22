/**
 * The website's copy of the promo video (after `npm run render:promo`):
 *   ../output/rapido-promo.mp4 (master, large)  →  ../public/promo/rapido-promo.mp4 (smaller, for the site)
 *                                                →  ../public/promo/rapido-promo.jpg (poster: the intro)
 * Uses Remotion's own ffmpeg, so nothing extra has to be installed.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const master = path.join(ROOT, "..", "output", "rapido-promo.mp4");
const out = path.join(ROOT, "..", "public", "promo");
if (!fs.existsSync(master)) throw new Error(`${master} is missing: run npm run render:promo first`);
fs.mkdirSync(out, { recursive: true });

const ffmpeg = (...args) => execFileSync("npx", ["remotion", "ffmpeg", "-v", "error", "-y", ...args], { cwd: ROOT, stdio: "inherit" });

// Full HD stays sharp (small text on screen); a higher CRF keeps the file small. No sound track.
ffmpeg("-i", master, "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", path.join(out, "rapido-promo.mp4"));
// Poster: the intro with the logo and the subjects (3.6 s in), 960 px wide.
ffmpeg("-ss", "3.6", "-i", master, "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "3", path.join(out, "rapido-promo.jpg"));

for (const name of ["rapido-promo.mp4", "rapido-promo.jpg"]) {
  const size = fs.statSync(path.join(out, name)).size;
  console.log(`public/promo/${name}: ${(size / 1024 / 1024).toFixed(1)} MB`);
}
