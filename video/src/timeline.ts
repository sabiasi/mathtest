/**
 * Timing for the tour: where each scene sits in the video, and how video time maps
 * back to the time of the recording (cuts, fast-forwarded typing, overall speed).
 *
 * Everything recorded (frames, cursor, clicks, captions…) is in SOURCE time = seconds
 * from the start of that scene's recording. The video asks "what was on screen at
 * source time s?", so all overlays stay in sync with the footage automatically.
 */
import data from "./data/capture.json";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** All footage plays this much faster than real time (keeps the tour under 2 minutes). */
export const FOOTAGE_SPEED = 1.35;
export const INTRO = 5;
export const RECAP = 5;
/** Title card: fades in over the previous scene's last moment, fades out over the new footage. */
export const TITLE = 2;
export const FADE = 0.3;

export type Box = { x: number; y: number; w: number; h: number };
export type CameraKey = { t: number; box: Box | null; pad: number; maxZoom: number };
export type Highlight = { t0: number; t1: number; box: Box; outline: boolean };
export type Caption = { t0: number; t1: number; text: string };
export type Segment = { t0: number; t1: number; rate: number };
export type SceneData = {
  id: string;
  title: string;
  /** Folder of the frames under public/ ("capture" = the tour, "promo" = the promo video). */
  dir?: string;
  /** Promo video: the subject whose colour the title card takes. */
  accent?: string;
  /** Playback speed of this scene's footage (default FOOTAGE_SPEED). */
  speed?: number;
  duration: number;
  frames: { t: number; file: string }[];
  viewport: { width: number; height: number };
  mouse: { t: number; x: number; y: number }[];
  clicks: { t: number; x: number; y: number }[];
  highlights: Highlight[];
  captions: Caption[];
  camera: CameraKey[];
  skips: Segment[];
  marks: Record<string, number>;
};

type Capture = { order: string[]; titles: Record<string, string>; scenes: Record<string, SceneData> };
const capture = data as unknown as Capture;

/** The scenes in storyboard order (only the ones that were recorded). */
export const SCENES: SceneData[] = capture.order.map((id) => capture.scenes[id]).filter(Boolean);

/* ---------- source ↔ video time inside one scene ---------- */

type Piece = { src0: number; src1: number; out0: number; rate: number };

const speedOf = (scene: SceneData) => scene.speed ?? FOOTAGE_SPEED;

/** The recording cut into pieces with their playback rate (0 = cut out). */
function pieces(scene: SceneData): Piece[] {
  const marks = [...scene.skips].sort((a, b) => a.t0 - b.t0);
  const result: Piece[] = [];
  let src = 0;
  let out = 0;
  const push = (src1: number, rate: number) => {
    if (src1 <= src) return;
    result.push({ src0: src, src1, out0: out, rate });
    out += rate === 0 ? 0 : (src1 - src) / (rate * speedOf(scene));
    src = src1;
  };
  for (const m of marks) {
    push(m.t0, 1);
    push(m.t1, m.rate);
  }
  push(scene.duration, 1);
  return result;
}

// Keyed by the scene object: the tour and the promo video both have scenes called "print".
const cache = new WeakMap<SceneData, Piece[]>();
const piecesOf = (scene: SceneData) => {
  if (!cache.has(scene)) cache.set(scene, pieces(scene));
  return cache.get(scene)!;
};

/** How long a scene's footage lasts in the video (seconds). */
export function footageLength(scene: SceneData): number {
  const last = piecesOf(scene).at(-1)!;
  return last.out0 + (last.rate === 0 ? 0 : (last.src1 - last.src0) / (last.rate * speedOf(scene)));
}

/** Video time (seconds from the footage start) → source time. */
export function toSource(scene: SceneData, out: number): number {
  const ps = piecesOf(scene).filter((p) => p.rate !== 0);
  for (const p of ps) {
    const len = (p.src1 - p.src0) / (p.rate * speedOf(scene));
    if (out <= p.out0 + len) return p.src0 + Math.max(0, out - p.out0) * p.rate * speedOf(scene);
  }
  return scene.duration;
}

/** How many video seconds one source second lasts at this moment (for speed-independent effects). */
export function rateAt(scene: SceneData, src: number): number {
  const p = piecesOf(scene).find((x) => src >= x.src0 && src < x.src1);
  return (p && p.rate ? p.rate : 1) * speedOf(scene);
}

/* ---------- the whole video ---------- */

export type Placed = { scene: SceneData; index: number; start: number; footageStart: number; footage: number; end: number };

export function layout() {
  const placed: Placed[] = [];
  let start = INTRO - FADE;
  SCENES.forEach((scene, index) => {
    const footage = footageLength(scene);
    const footageStart = start + TITLE - FADE;
    const end = footageStart + footage;
    placed.push({ scene, index, start, footageStart, footage, end });
    start = end - FADE;
  });
  const recapStart = start;
  return { placed, recapStart, total: recapStart + RECAP };
}
