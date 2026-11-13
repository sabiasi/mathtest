/**
 * "Label the diagram" (biology): the pure calculations, shared by the editor,
 * the paper and the answer key.
 *
 * The DRAWING AREA is the picture plus empty room on the left and right (for
 * the label boxes) and a little above and below. Every position (where a line
 * points, where its label sits) is saved in % of this area, so it stays right
 * at any printed size.
 */
import type { DiagramLabel, LabelDiagramQuestion, LabelStyle } from "@/lib/storage/types";
import { optionLabel } from "@/lib/questions";
import { getDrawing } from "@/subjects/biology/drawings";

/** Room at each side, as a part of the picture's width. */
export const SIDE = 0.32;
/** Room above and below, as a part of the picture's height. */
export const PAD = 0.05;

export const LABEL_LIMITS = { labels: 20, width: { min: 60, max: 100 } };

type Picture = NonNullable<LabelDiagramQuestion["picture"]>;

/** The picture's own width and height (built-in drawings: their size in drawings.ts). */
export function pictureSize(picture: Picture): { width: number; height: number } {
  if (picture.kind === "builtin") {
    const drawing = getDrawing(picture.drawing);
    return { width: drawing.width, height: drawing.height };
  }
  return { width: picture.width, height: picture.height };
}

/** Width ÷ height of the whole drawing area. */
export function areaAspect(width: number, height: number): number {
  return (width * (1 + 2 * SIDE)) / (height * (1 + 2 * PAD));
}

/** Where the picture sits inside the area, in %. */
export const PICTURE_BOX = {
  left: (SIDE / (1 + 2 * SIDE)) * 100,
  top: (PAD / (1 + 2 * PAD)) * 100,
  width: 100 / (1 + 2 * SIDE),
  height: 100 / (1 + 2 * PAD),
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

/** A point on the picture (in the picture's own units) → % of the drawing area. */
export function toArea(px: number, py: number, width: number, height: number): { x: number; y: number } {
  return {
    x: round1(PICTURE_BOX.left + (px / width) * PICTURE_BOX.width),
    y: round1(PICTURE_BOX.top + (py / height) * PICTURE_BOX.height),
  };
}

/** The middle of the left and right margins, where labels go by default. */
export const LABEL_COLUMNS = { left: round1(PICTURE_BOX.left / 2), right: round1(100 - PICTURE_BOX.left / 2) };

/**
 * How far apart (in % of the area's height) two labels on the same side
 * must be so their boxes don't overlap: about 11 mm on a full-width print
 * (room for a name on two lines).
 */
export function labelGap(aspect: number): number {
  return clamp(6 * aspect, 5, 18);
}

/**
 * Spreads labels along one side: each as level with its point as possible,
 * at least `gap` apart, and in the same order as the points (so no two
 * lines cross). `ys` must be sorted from top to bottom.
 */
export function spreadAlongSide(ys: readonly number[], gap: number, top = 3, bottom = 97): number[] {
  const result = ys.map((y) => clamp(y, top, bottom));
  for (let i = 1; i < result.length; i++) result[i] = Math.max(result[i], result[i - 1] + gap);
  // Too low at the end: push everything back up (as little as needed).
  if (result.length && result[result.length - 1] > bottom) {
    result[result.length - 1] = bottom;
    for (let i = result.length - 2; i >= 0; i--) result[i] = Math.min(result[i], result[i + 1] - gap);
  }
  return result.map((y) => round1(clamp(y, top, bottom)));
}

/**
 * A good place for a new label pointing at (x, y): in the margin on the
 * nearer side, as level with the point as possible without touching the
 * other labels. If that side is full, the other side.
 */
export function placeLabel(labels: readonly Pick<DiagramLabel, "lx" | "ly">[], x: number, y: number, aspect: number): { lx: number; ly: number } {
  const gap = labelGap(aspect);
  const sides = x < 50 ? [LABEL_COLUMNS.left, LABEL_COLUMNS.right] : [LABEL_COLUMNS.right, LABEL_COLUMNS.left];
  for (const lx of sides) {
    const taken = labels.filter((l) => Math.abs(l.lx - lx) < 15).map((l) => l.ly);
    for (let step = 0; step < 40; step++) {
      // y, then just below, just above, a bit further below…
      const offset = Math.ceil(step / 2) * (gap / 2) * (step % 2 ? 1 : -1);
      const ly = round1(y + offset);
      if (ly < 3 || ly > 97) continue;
      if (taken.every((t) => Math.abs(t - ly) >= gap)) return { lx, ly };
    }
  }
  return { lx: sides[0], ly: round1(clamp(y, 3, 97)) };
}

/** Labels for every part of a built-in drawing (skipping names that are already there), spread over both sides. */
export function labelsForParts(
  existing: readonly DiagramLabel[],
  parts: readonly { x: number; y: number; name: string }[],
  width: number,
  height: number,
  newId: () => string,
): DiagramLabel[] {
  const aspect = areaAspect(width, height);
  const have = new Set(existing.map((l) => simplify(l.answer)));
  const todo = parts.filter((p) => !have.has(simplify(p.name))).map((p) => ({ ...toArea(p.x, p.y, width, height), name: p.name }));

  // Labels already there: fit each new one in where there's room.
  if (existing.length > 0) {
    const result = [...existing];
    for (const part of [...todo].sort((a, b) => a.y - b.y)) {
      result.push({ id: newId(), x: part.x, y: part.y, ...placeLabel(result, part.x, part.y, aspect), answer: part.name });
    }
    return result;
  }

  // A fresh drawing: points on the left get labels on the left, the rest on
  // the right; a side that is too full hands its middle-most points over.
  const gap = labelGap(aspect);
  const capacity = Math.floor(94 / gap) + 1;
  const left = todo.filter((p) => p.x < 50);
  const right = todo.filter((p) => p.x >= 50);
  const byCentre = (list: typeof todo) => list.reduce((best, p, i) => (Math.abs(p.x - 50) < Math.abs(list[best].x - 50) ? i : best), 0);
  while (left.length > capacity && right.length < capacity) right.push(...left.splice(byCentre(left), 1));
  while (right.length > capacity && left.length < capacity) left.push(...right.splice(byCentre(right), 1));

  const result: DiagramLabel[] = [];
  for (const [side, lx] of [[left, LABEL_COLUMNS.left], [right, LABEL_COLUMNS.right]] as const) {
    const sorted = [...side].sort((a, b) => a.y - b.y);
    const lys = spreadAlongSide(sorted.map((p) => p.y), gap);
    const labels = sorted.map((p, i) => ({ id: newId(), x: p.x, y: p.y, lx, ly: lys[i], answer: p.name }));
    result.push(...uncross(labels, aspect));
  }
  // Number them top to bottom (as a teacher would).
  return numberTopToBottom(result);
}

/** Do the lines a→b and c→d cross (touching ends don't count)? Works in any units. */
export function linesCross(a: [number, number], b: [number, number], c: [number, number], d: [number, number]): boolean {
  const side = (p: [number, number], q: [number, number], r: [number, number]) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = side(c, d, a);
  const d2 = side(c, d, b);
  const d3 = side(a, b, c);
  const d4 = side(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/**
 * Labels on one side whose lines cross swap places (a few rounds). The
 * places themselves stay, so the labels stay apart.
 */
function uncross(labels: DiagramLabel[], aspect: number): DiagramLabel[] {
  const result = labels.map((l) => ({ ...l }));
  // In real proportions (the area is wider than tall), so "crossing" means what the eye sees.
  const at = (x: number, y: number): [number, number] => [x * aspect, y];
  for (let round = 0; round < 30; round++) {
    let swapped = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];
        if (!linesCross(at(a.lx, a.ly), at(a.x, a.y), at(b.lx, b.ly), at(b.x, b.y))) continue;
        [a.ly, b.ly] = [b.ly, a.ly];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return result;
}

/** Numbers top to bottom, left before right on the same height. */
export function numberTopToBottom(labels: readonly DiagramLabel[]): DiagramLabel[] {
  return [...labels].sort((a, b) => a.ly - b.ly || a.lx - b.lx);
}

const simplify = (word: string) => word.trim().toLocaleLowerCase();

/** The words for the word box: the answers and the extra words, each once, without empty ones. */
export function bankWords(question: Pick<LabelDiagramQuestion, "labels" | "extras">): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const word of [...question.labels.map((l) => l.answer), ...question.extras]) {
    const key = simplify(word);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    words.push(word.trim());
  }
  return words;
}

/** The word box as printed: shuffled on printed copies ("match"), alphabetical otherwise. */
export function printedBank(question: LabelDiagramQuestion): string[] {
  if (question.mode === "match") return question.shownBank ?? bankWords(question);
  return bankWords(question).sort((a, b) => a.localeCompare(b, "ka"));
}

/** "match" mode: the letter of each label's answer in the printed word box ("" if the answer is missing). */
export function labelLetters(question: LabelDiagramQuestion, style: LabelStyle): string[] {
  const bank = printedBank(question).map(simplify);
  return question.labels.map((label) => {
    const index = bank.indexOf(simplify(label.answer));
    return index >= 0 && label.answer.trim() ? optionLabel(index, style) : "";
  });
}

/** Keeps a position inside the area (and rounds it). */
export function clampPosition(value: number): number {
  return round1(clamp(value));
}
