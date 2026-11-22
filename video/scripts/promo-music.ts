/**
 * Background music for the promo video, composed here in code (original, so no licence is needed),
 * then mixed UNDER the owner's voice:
 *   out/promo-music.wav  the music alone (as long as the video)
 *   out/promo-sound.wav  voice + music: the music sits ~10 dB below the voice and dips further while
 *                        someone speaks ("ducking"); `npm run finish:promo` prefers this file.
 *
 *   npm run music:promo          (after npm run voice:promo)
 *
 * The music: calm "lo-fi", 74 BPM, four chords (Fmaj7 → Em7 → Dm9 → Cmaj7) with a warm pad, a soft
 * electric piano playing broken chords, a round bass and a very light shaker / kick. Only the pad
 * plays under the intro; it ends on Fmaj7 and fades out with the video. Seeded, so every run gives
 * the same music. Levels: MUSIC_LUFS (alone) and DUCK (how far it dips under the voice).
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { promoLayout } from "../src/promo/timeline";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "out");
const VOICE = path.join(OUT, "promo-voice.wav");
const MUSIC = path.join(OUT, "promo-music.wav");
const SOUND = path.join(OUT, "promo-sound.wav");

/** Loudness of the music where nobody speaks (the voice is −16). Lower = quieter music. */
const MUSIC_LUFS = -25;
/** How strongly the music dips while the voice speaks (sidechain compressor ratio). */
const DUCK = 2;

const RATE = 44100;
const BPM = 74;
const BEAT = 60 / BPM;
const BAR = 4 * BEAT;

const FFMPEG = process.env.FFMPEG_PATH ?? (createRequire(path.join(ROOT, "..", "package.json"))("ffmpeg-static") as string);
function ffmpeg(args: string[]): string {
  const run = spawnSync(FFMPEG, ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(`ffmpeg failed:\n${run.stderr.slice(-2000)}`);
  return run.stderr;
}

// ---- small tools ----
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const TAU = Math.PI * 2;

function writeWav(file: string, left: Float32Array, right: Float32Array) {
  const n = left.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}

// ---- the music ----
type Chord = { pad: number[]; arp: number[]; bass: number };
const CHORDS: Chord[] = [
  { pad: [53, 57, 60, 64], arp: [65, 69, 72, 76], bass: 41 }, // Fmaj7
  { pad: [52, 55, 59, 62], arp: [64, 67, 71, 74], bass: 40 }, // Em7
  { pad: [50, 53, 57, 64], arp: [62, 65, 69, 76], bass: 38 }, // Dm9
  { pad: [48, 55, 59, 64], arp: [60, 64, 67, 71], bass: 36 }, // Cmaj7
];
/** Broken-chord patterns on the 8 eighth notes of a bar (index into chord.arp; -1 = rest). */
const PATTERNS = [
  [0, -1, 2, 1, -1, 3, 2, -1],
  [-1, 1, 3, -1, 2, -1, 0, -1],
  [0, 2, -1, 3, -1, 1, -1, 2],
  [-1, 2, 1, -1, 3, -1, 2, 1],
];

function compose(total: number) {
  const n = Math.ceil(total * RATE);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const rnd = seeded(20261122);
  const add = (i: number, l: number, r: number) => {
    if (i >= 0 && i < n) {
      L[i] += l;
      R[i] += r;
    }
  };

  // Warm pad: three soft partials, two slightly detuned voices (left / right), slow swell.
  function pad(notes: number[], start: number, length: number, gain: number) {
    const attack = 1.6;
    const release = 1.8;
    const s0 = Math.floor(start * RATE);
    const len = Math.floor((length + release) * RATE);
    for (const note of notes) {
      const f = hz(note);
      const fl = f * 2 ** (-4 / 1200);
      const fr = f * 2 ** (4 / 1200);
      const phase = rnd() * TAU;
      for (let k = 0; k < len; k++) {
        const t = k / RATE;
        const env = Math.min(1, t / attack) * (t > length ? Math.max(0, 1 - (t - length) / release) : 1);
        const wob = 1 + 0.08 * Math.sin(TAU * 0.23 * t + phase);
        const v = (ff: number) => Math.sin(TAU * ff * t + phase) + 0.22 * Math.sin(2 * TAU * ff * t) + 0.07 * Math.sin(3 * TAU * ff * t);
        const a = env * gain * wob;
        add(s0 + k, a * v(fl), a * v(fr));
      }
    }
  }

  // Soft electric piano (simple FM): a bright start that mellows, long gentle decay.
  function piano(note: number, start: number, velocity: number, pan: number) {
    const f = hz(note);
    const s0 = Math.floor(start * RATE);
    const len = Math.floor(2.6 * RATE);
    for (let k = 0; k < len; k++) {
      const t = k / RATE;
      const env = Math.min(1, t / 0.006) * Math.exp(-t / 1.1) * (t > 2.3 ? Math.max(0, 1 - (t - 2.3) / 0.3) : 1);
      const index = 1.1 * Math.exp(-t / 0.22) + 0.12;
      const v = Math.sin(TAU * f * t + index * Math.sin(TAU * f * t)) * env * velocity * 0.11;
      add(s0 + k, v * (1 - pan) , v * (1 + pan));
    }
  }

  // Round bass: fundamental + a little second harmonic.
  function bass(note: number, start: number, length: number) {
    const f = hz(note);
    const s0 = Math.floor(start * RATE);
    const len = Math.floor((length + 0.2) * RATE);
    for (let k = 0; k < len; k++) {
      const t = k / RATE;
      const env = Math.min(1, t / 0.03) * (0.6 + 0.4 * Math.exp(-t / 0.4)) * (t > length ? Math.max(0, 1 - (t - length) / 0.2) : 1);
      const v = (Math.sin(TAU * f * t) + 0.25 * Math.sin(2 * TAU * f * t)) * env * 0.2;
      add(s0 + k, v, v);
    }
  }

  // Very light shaker (filtered noise) and a soft kick.
  function shaker(start: number, gain: number, pan: number) {
    const s0 = Math.floor(start * RATE);
    let prev = 0;
    for (let k = 0; k < Math.floor(0.09 * RATE); k++) {
      const t = k / RATE;
      const noise = rnd() * 2 - 1;
      const hp = noise - prev;
      prev = noise;
      const v = hp * Math.min(1, t / 0.008) * Math.exp(-t / 0.028) * gain;
      add(s0 + k, v * (1 - pan), v * (1 + pan));
    }
  }
  function kick(start: number, gain: number) {
    const s0 = Math.floor(start * RATE);
    let phase = 0;
    for (let k = 0; k < Math.floor(0.45 * RATE); k++) {
      const t = k / RATE;
      const f = 45 + 70 * Math.exp(-t / 0.035);
      phase += (TAU * f) / RATE;
      add(s0 + k, Math.sin(phase) * Math.exp(-t / 0.16) * gain, Math.sin(phase) * Math.exp(-t / 0.16) * gain);
    }
  }

  // Arrangement: bars 0–1 pad only (the intro), then everything; the last bars rest on Fmaj7.
  const ending = total - 5.5; // from here: the final chord rings out
  const bars = Math.floor(ending / BAR);
  for (let b = 0; b < bars; b++) {
    const chord = CHORDS[b % 4];
    const t0 = b * BAR;
    pad(chord.pad, t0, BAR, 0.035);
    if (b < 2) continue;
    bass(chord.bass, t0, 2 * BEAT);
    bass(chord.bass, t0 + 2.5 * BEAT, 1.3 * BEAT);
    const pattern = PATTERNS[(Math.floor(b / 4) + (b % 4 === 3 ? 1 : 0)) % PATTERNS.length];
    pattern.forEach((idx, e) => {
      if (idx < 0) return;
      const swing = e % 2 === 1 ? 0.12 * (BEAT / 2) : 0;
      const humanise = (rnd() - 0.5) * 0.012;
      piano(chord.arp[idx], t0 + (e * BEAT) / 2 + swing + humanise, 0.65 + 0.35 * rnd(), (rnd() - 0.5) * 0.5);
    });
    if (b >= 4) {
      for (let e = 1; e < 8; e += 2) shaker(t0 + (e * BEAT) / 2 + 0.12 * (BEAT / 2), 0.05, e % 4 === 1 ? -0.3 : 0.3);
      kick(t0, 0.22);
      kick(t0 + 2 * BEAT, 0.16);
    }
  }
  // The ending: Fmaj7 rings out (pad + one soft piano chord), bass on F.
  const tEnd = bars * BAR;
  pad(CHORDS[0].pad, tEnd, total - tEnd - 1.8, 0.035);
  bass(CHORDS[0].bass, tEnd, 2.5);
  CHORDS[0].arp.forEach((note, i) => piano(note, tEnd + i * 0.07, 0.6, (i - 1.5) * 0.15));

  // Fade in (2 s) and out (3 s).
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const g = Math.min(1, t / 2) * Math.min(1, Math.max(0, (total - t) / 3));
    L[i] *= g;
    R[i] *= g;
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  for (let i = 0; i < n; i++) {
    L[i] *= 0.7 / peak;
    R[i] *= 0.7 / peak;
  }
  return { L, R };
}

/** A soft room: 2.4 s of fading, darkened noise (different left / right) as a reverb impulse. */
function impulse(file: string) {
  const n = Math.floor(2.4 * RATE);
  const rnd = seeded(7);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  let l = 0;
  let r = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.exp(-t / 0.55) * Math.min(1, t / 0.01);
    l = 0.75 * l + 0.25 * (rnd() * 2 - 1);
    r = 0.75 * r + 0.25 * (rnd() * 2 - 1);
    L[i] = l * env;
    R[i] = r * env;
  }
  writeWav(file, L, R);
}

function lufsOf(args: string[], chain: string): Record<string, string> {
  const log = ffmpeg([...args, "-filter_complex", `${chain},loudnorm=print_format=json`, "-f", "null", "-"]);
  return JSON.parse(log.slice(log.lastIndexOf("{"), log.lastIndexOf("}") + 1));
}

function main() {
  const { total } = promoLayout();
  fs.mkdirSync(OUT, { recursive: true });

  // 1. Compose, then warm it up (gentle low-pass) and add the room.
  const dry = path.join(OUT, "promo-music-dry.wav");
  const ir = path.join(OUT, "promo-music-room.wav");
  const { L, R } = compose(total);
  writeWav(dry, L, R);
  impulse(ir);
  const room = "[0:a]lowpass=f=7000,asplit[d][w];[w][1:a]afir=dry=0:wet=1[r];[d][r]amix=inputs=2:weights=1 0.3:normalize=0";
  const m = lufsOf(["-i", dry, "-i", ir], room);
  const gain = MUSIC_LUFS - Number(m.input_i);
  ffmpeg(["-y", "-i", dry, "-i", ir, "-filter_complex", `${room},volume=${gain.toFixed(2)}dB,aresample=48000[out]`, "-map", "[out]", "-c:a", "pcm_s16le", MUSIC]);
  fs.rmSync(dry);
  fs.rmSync(ir);
  console.log(`→ out/promo-music.wav (${total.toFixed(1)} s, ${MUSIC_LUFS} LUFS)`);

  // 2. Under the voice: the voice drives a compressor on the music (it dips while someone speaks).
  if (!fs.existsSync(VOICE)) {
    console.log("No out/promo-voice.wav (npm run voice:promo): the video gets the music alone.");
    fs.copyFileSync(MUSIC, SOUND);
    return;
  }
  ffmpeg([
    "-y", "-i", VOICE, "-i", MUSIC, "-filter_complex",
    "[0:a]aformat=channel_layouts=stereo,asplit[v][key];" +
      `[1:a][key]sidechaincompress=threshold=0.015:ratio=${DUCK}:attack=80:release=900:knee=4[m];` +
      "[v][m]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.9:level=false[out]",
    "-map", "[out]", "-c:a", "pcm_s16le", SOUND,
  ]);
  const s = lufsOf(["-i", SOUND], "[0:a]anull");
  console.log(`→ out/promo-sound.wav (voice + music, ${Number(s.input_i).toFixed(1)} LUFS, peak ${s.input_tp} dB)`);
}

main();
