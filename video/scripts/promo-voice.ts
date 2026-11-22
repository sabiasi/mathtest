/**
 * The promo video's voice track, made from the owner's ONE recording (voice/promo-recording.ka.m4a):
 *   1. cut each scene's words out of it (promo-voice.json: where they are; labels and retakes left out),
 *   2. shorten long pauses inside a scene (a pause stays a pause, only shorter),
 *   3. put each scene's words where its title card starts (src/promo/timeline.ts),
 *   4. even out the loudness (−16 LUFS, like the tutorial videos).
 * → out/promo-voice.wav (as long as the video). `npm run music:promo` then lays the background music
 * under it (out/promo-sound.wav), and `npm run finish:promo` adds that to the video.
 *
 *   npm run voice:promo
 *
 * Needs a FULL ffmpeg (Remotion's own has no compressor / high-pass): the app's `ffmpeg-static`
 * dev package, or FFMPEG_PATH.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { type Placed, promoLayout } from "../src/promo/timeline";
import { toSource } from "../src/timeline";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "out", "promo-voice");
const TRACK = path.join(ROOT, "out", "promo-voice.wav");

/** Seconds after a title card appears before the voice starts. */
const LEAD = 0.4;
/** Longest pause kept inside a scene (seconds); tighter when a scene's words don't fit. */
const PAUSES = [0.7, 0.55, 0.42];
/** Faster than this never (only when shorter pauses and starting earlier aren't enough). */
const MAX_TEMPO = 1.08;
/** Quiet enough to count as a pause (the recording's silence is about −75 dB, speech −31 dB). */
const SILENCE_DB = -45;

type Cue = { range: [number, number]; afterClick: number; delay?: number };
type Cuts = { recording: string; scenes: Record<string, ([number, number] | Cue)[]> };
type Span = [number, number];

function ffmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    return createRequire(path.join(ROOT, "..", "package.json"))("ffmpeg-static") as string;
  } catch {
    throw new Error("No full ffmpeg found: run npm install in the project root, or set FFMPEG_PATH");
  }
}
const FFMPEG = ffmpegPath();

/** Runs ffmpeg; returns what it printed (filter reports like silencedetect / loudnorm go there). */
function stderrOf(args: string[]): string {
  const run = spawnSync(FFMPEG, ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(`ffmpeg failed:\n${run.stderr.slice(-2000)}`);
  return run.stderr;
}

/** Pauses in the whole recording, as [start, end] seconds. */
function silences(file: string): Span[] {
  const log = stderrOf(["-i", file, "-af", `silencedetect=noise=${SILENCE_DB}dB:d=0.25`, "-f", "null", "-"]);
  const spans: Span[] = [];
  let start: number | null = null;
  for (const line of log.split("\n")) {
    const s = line.match(/silence_start: ([\d.]+)/);
    const e = line.match(/silence_end: ([\d.]+)/);
    if (s) start = Number(s[1]);
    if (e && start !== null) {
      spans.push([start, Number(e[1])]);
      start = null;
    }
  }
  return spans;
}

/** The parts of [a, b] where someone speaks. */
function speechIn([a, b]: Span, quiet: Span[]): Span[] {
  const out: Span[] = [];
  let at = a;
  for (const [s, e] of quiet) {
    if (e <= at || s >= b) continue;
    if (s > at) out.push([at, s]);
    at = Math.max(at, e);
  }
  if (at < b) out.push([at, b]);
  return out.filter(([s, e]) => e - s >= 0.06);
}

/** The pieces of the recording to play, in order: speech + pauses no longer than maxPause. */
function pieces(ranges: Span[], quiet: Span[], maxPause: number): Span[] {
  const speech = ranges.flatMap((r) => speechIn(r, quiet));
  if (speech.length === 0) return [];
  const out: Span[] = [];
  const half = maxPause / 2;
  let cur: Span = [Math.max(0, speech[0][0] - 0.08), speech[0][1]];
  for (let i = 1; i < speech.length; i++) {
    const [s, e] = speech[i];
    const gap = s - cur[1];
    const sameRange = ranges.some(([a, b]) => cur[0] >= a - 0.1 && cur[1] <= b && s >= a && e <= b);
    if (gap <= maxPause && sameRange) {
      cur[1] = e;
    } else {
      out.push([cur[0], cur[1] + half]);
      cur = [s - half, e];
    }
  }
  out.push([cur[0], cur[1] + 0.2]);
  return out;
}

/** Video time (seconds from the footage start) at which the footage reaches source second `src`. */
function outAt(place: Placed, src: number): number {
  let lo = 0;
  let hi = place.footage;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (toSource(place.scene, mid) < src) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** A scene's words as groups: plain pieces join the group before; a cue starts a new group at its click. */
function groupsOf(entry: ([number, number] | Cue)[], id: string, place: Placed | undefined): { ranges: Span[]; cue?: number }[] {
  const groups: { ranges: Span[]; cue?: number }[] = [{ ranges: [] }];
  for (const item of entry) {
    if (Array.isArray(item)) {
      groups.at(-1)!.ranges.push(item);
      continue;
    }
    const click = place?.scene.clicks[item.afterClick];
    if (!place || !click) throw new Error(`${id}: there is no click ${item.afterClick} in this scene's footage`);
    groups.push({ ranges: [item.range], cue: place.footageStart + outAt(place, click.t) + (item.delay ?? 0.5) });
  }
  return groups.filter((g) => g.ranges.length > 0);
}

const length = (ps: Span[]) => ps.reduce((sum, [s, e]) => sum + (e - s), 0);

function main() {
  const cuts = JSON.parse(fs.readFileSync(path.join(ROOT, "promo-voice.json"), "utf8")) as Cuts;
  const recording = path.join(ROOT, cuts.recording);
  if (!fs.existsSync(recording)) {
    console.log(`No recording at ${cuts.recording}: the video stays silent.`);
    fs.rmSync(TRACK, { force: true });
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // The voice + music mix is made from THIS track: an old one must not reach the video.
  fs.rmSync(path.join(ROOT, "out", "promo-sound.wav"), { force: true });
  const quiet = silences(recording);
  const { placed, outroStart, total } = promoLayout();

  // When each scene's voice may start / must end (title card start → just before the next one).
  const slots = [
    { id: "intro", start: 0, next: placed[0].start, place: undefined as Placed | undefined },
    ...placed.map((p, i) => ({ id: p.scene.id, start: p.start, next: i + 1 < placed.length ? placed[i + 1].start : outroStart, place: p })),
    { id: "outro", start: outroStart, next: total - 0.3, place: undefined as Placed | undefined },
  ];

  const clips: { file: string; at: number }[] = [];
  const clock = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
  let prevEnd = 0;
  console.log("scene          starts   length  pause  tempo");
  for (const slot of slots) {
    const entry = cuts.scenes[slot.id];
    if (!entry) {
      console.log(`${slot.id.padEnd(14)} (no words)`);
      continue;
    }
    const groups = groupsOf(entry, slot.id, slot.place);
    groups.forEach((group, g) => {
      const name = groups.length > 1 ? `${slot.id}·${g + 1}` : slot.id;
      const following = groups[g + 1]?.cue;
      // Words that waited for the screen may run a moment into the next title card (its voice then starts later).
      const limit = following !== undefined ? following - 0.2 : group.cue !== undefined ? slot.next + 0.3 : slot.next - 0.15;
      const wanted = group.cue ?? slot.start + LEAD;
      // Only a scene's first words may start a little early (in the previous scene's last hold).
      const earliest = group.cue !== undefined ? wanted : slot.id === "intro" ? 0.2 : Math.max(prevEnd + 0.5, slot.start - 1.5);
      let maxPause = PAUSES[0];
      let ps = pieces(group.ranges, quiet, maxPause);
      for (const p of PAUSES) {
        maxPause = p;
        ps = pieces(group.ranges, quiet, p);
        if (Math.max(wanted, prevEnd + 0.4) + length(ps) <= limit) break;
      }
      const len = length(ps);
      let at = Math.max(wanted, prevEnd + 0.4);
      if (at + len > limit) at = Math.max(earliest, limit - len);
      const tempo = Math.max(1, len / (limit - at));
      if (tempo > MAX_TEMPO) throw new Error(`${name}: ${len.toFixed(1)} s of words don't fit in ${(limit - at).toFixed(1)} s`);

      const file = path.join(OUT_DIR, `${String(clips.length).padStart(2, "0")}-${slot.id}.wav`);
      const parts = ps.map(([s, e], i) => `[0:a]atrim=${s.toFixed(3)}:${e.toFixed(3)},asetpts=PTS-STARTPTS[p${i}]`);
      const joined = `${ps.map((_, i) => `[p${i}]`).join("")}concat=n=${ps.length}:v=0:a=1`;
      const finish = `${tempo > 1.001 ? `,atempo=${tempo.toFixed(4)}` : ""},afade=t=in:d=0.02,areverse,afade=t=in:d=0.06,areverse[out]`;
      stderrOf(["-y", "-i", recording, "-filter_complex", `${parts.join(";")};${joined},aformat=sample_rates=48000:channel_layouts=mono${finish}`, "-map", "[out]", file]);

      const played = len / tempo;
      clips.push({ file, at });
      prevEnd = at + played;
      const cueNote = group.cue !== undefined ? `  (waits for the screen: ${clock(group.cue)})` : "";
      console.log(`${name.padEnd(14)} ${clock(at).padStart(6)}  ${played.toFixed(1).padStart(5)} s  ${maxPause.toFixed(2)}  ${tempo.toFixed(2)}${cueNote}`);
    });
  }

  // One track: every clip at its moment, then a gentle clean-up and two-pass loudness (linear).
  const inputs = clips.flatMap((c) => ["-i", c.file]);
  const delays = clips.map((c, i) => `[${i}:a]adelay=${Math.round(c.at * 1000)}:all=1[d${i}]`).join(";");
  const mix = `${clips.map((_, i) => `[d${i}]`).join("")}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad,atrim=0:${total.toFixed(3)}`;
  const clean = "highpass=f=70,acompressor=threshold=-24dB:ratio=2.5:attack=8:release=160:makeup=2";
  const measure = stderrOf([...inputs, "-filter_complex", `${delays};${mix},${clean},loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json`, "-f", "null", "-"]);
  const m = JSON.parse(measure.slice(measure.lastIndexOf("{"), measure.lastIndexOf("}") + 1)) as Record<string, string>;
  const norm = `loudnorm=I=-16:TP=-1.5:LRA=9:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  stderrOf(["-y", ...inputs, "-filter_complex", `${delays};${mix},${clean},${norm},aresample=48000[out]`, "-map", "[out]", "-c:a", "pcm_s16le", TRACK]);
  console.log(`→ out/promo-voice.wav (${total.toFixed(1)} s; was ${Number(m.input_i).toFixed(1)} LUFS, now −16)`);
}

main();
