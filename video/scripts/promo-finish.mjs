/**
 * The promo master: out/promo-raw.mp4 (Remotion, full-range colours, silent) → ../output/rapido-promo.mp4
 * (standard-range yuv420p H.264) with sound: voice + background music (out/promo-sound.wav, from
 * `npm run music:promo`), else the voice alone (out/promo-voice.wav), else silent. Remotion's own ffmpeg.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw = path.join(ROOT, "out", "promo-raw.mp4");
const sound = ["promo-sound.wav", "promo-voice.wav"].map((f) => path.join(ROOT, "out", f)).find((f) => fs.existsSync(f));
const master = path.join(ROOT, "..", "output", "rapido-promo.mp4");
if (!fs.existsSync(raw)) throw new Error(`${raw} is missing: run npm run render:promo first`);
fs.mkdirSync(path.dirname(master), { recursive: true });

const audio = sound ? ["-i", sound, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-shortest"] : ["-an"];
execFileSync(
  "npx",
  ["remotion", "ffmpeg", "-v", "error", "-y", "-i", raw, ...audio,
    "-vf", "scale=in_range=full:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-movflags", "+faststart", master],
  { cwd: ROOT, stdio: "inherit" },
);
console.log(`output/rapido-promo.mp4 ${sound ? `with ${path.basename(sound)}` : "(silent: no voice or music)"}`);
