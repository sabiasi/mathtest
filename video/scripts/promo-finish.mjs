/**
 * The promo master: out/promo-raw.mp4 (Remotion, full-range colours, silent) → ../output/rapido-promo.mp4
 * (standard-range yuv420p H.264), with the owner's voice (out/promo-voice.wav, from
 * `npm run voice:promo`) when it exists. Uses Remotion's own ffmpeg.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw = path.join(ROOT, "out", "promo-raw.mp4");
const voice = path.join(ROOT, "out", "promo-voice.wav");
const master = path.join(ROOT, "..", "output", "rapido-promo.mp4");
if (!fs.existsSync(raw)) throw new Error(`${raw} is missing: run npm run render:promo first`);
fs.mkdirSync(path.dirname(master), { recursive: true });

const hasVoice = fs.existsSync(voice);
const sound = hasVoice ? ["-i", voice, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-shortest"] : ["-an"];
execFileSync(
  "npx",
  ["remotion", "ffmpeg", "-v", "error", "-y", "-i", raw, ...sound,
    "-vf", "scale=in_range=full:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-movflags", "+faststart", master],
  { cwd: ROOT, stdio: "inherit" },
);
console.log(`output/rapido-promo.mp4 ${hasVoice ? "with the voice" : "(silent: no out/promo-voice.wav)"}`);
