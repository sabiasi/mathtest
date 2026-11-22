/**
 * Timing of the promo video: intro → (title card + footage) × scenes → outro.
 * The footage maths (cuts, fast-forwarded typing) is shared with the tour (../timeline.ts);
 * only the speed and the card lengths are the promo's own.
 */
import data from "../data/promo.json";
import { footageLength, type SceneData } from "../timeline";

/**
 * Playback speed of all promo footage (1 = real time). The calm pace itself is recorded
 * (PACE in capture/promo-scenes.mjs); this only fine-tunes the length without recording again.
 */
export const PROMO_SPEED = 1.1;
export const INTRO = 5;
export const TITLE = 2.5;
export const OUTRO = 7;
export const FADE = 0.3;

type Capture = { order: string[]; scenes: Record<string, SceneData> };
const capture = data as unknown as Capture;

export const PROMO_SCENES: SceneData[] = capture.order
  .map((id) => capture.scenes[id])
  .filter(Boolean)
  .map((scene) => ({ ...scene, dir: scene.dir ?? "promo", speed: PROMO_SPEED }));

export type Placed = { scene: SceneData; index: number; start: number; footageStart: number; footage: number; end: number };

export function promoLayout() {
  const placed: Placed[] = [];
  let start = INTRO - FADE;
  PROMO_SCENES.forEach((scene, index) => {
    const footage = footageLength(scene);
    const footageStart = start + TITLE - FADE;
    const end = footageStart + footage;
    placed.push({ scene, index, start, footageStart, footage, end });
    start = end - FADE;
  });
  return { placed, outroStart: start, total: start + OUTRO };
}
