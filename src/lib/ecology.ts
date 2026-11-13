/**
 * Ecology (biology): food chains / webs on a grid, and ecological pyramids.
 * Pure functions: samples, free places, and where the arrows go.
 */
import type { FoodWebOrganism, FoodWebQuestion, PyramidLevel } from "@/lib/storage/types";

export const WEB_LIMITS = { cols: 5, rows: 5, organisms: 16, arrows: 30, levels: 5 };
/** Drawing units: one grid cell, and an organism's box inside it. */
export const WEB_UNITS = { col: 104, row: 70, boxW: 88, boxH: 34, gap: 3 };

type Web = Pick<FoodWebQuestion, "organisms" | "arrows">;

const organism = (id: string, name: string, col: number, row: number): FoodWebOrganism => ({ id, name, col, row, hidden: false });

/** A food chain: grass → hare → fox (left to right). */
export function sampleChain(newId: () => string): Web {
  const [a, b, c] = [newId(), newId(), newId()];
  return {
    organisms: [organism(a, "ბალახი", 0, 0), organism(b, "კურდღელი", 1, 0), { ...organism(c, "მელა", 2, 0), hidden: true }],
    arrows: [
      { id: newId(), from: a, to: b },
      { id: newId(), from: b, to: c },
    ],
  };
}

/** A small food web: producers at the bottom, predators at the top. */
export function sampleWeb(newId: () => string): Web {
  const ids = Array.from({ length: 8 }, newId);
  const [grass, tree, grasshopper, hare, mouse, squirrel, fox, owl] = ids;
  const organisms = [
    organism(grass, "ბალახი", 1, 2),
    organism(tree, "მუხა", 3, 2),
    organism(grasshopper, "კალია", 0, 1),
    organism(hare, "კურდღელი", 1, 1),
    { ...organism(mouse, "თაგვი", 2, 1), hidden: true },
    organism(squirrel, "ციყვი", 3, 1),
    organism(fox, "მელა", 1, 0),
    { ...organism(owl, "ბუ", 3, 0), hidden: true },
  ];
  const pairs: [string, string][] = [
    [grass, grasshopper],
    [grass, hare],
    [grass, mouse],
    [tree, mouse],
    [tree, squirrel],
    [hare, fox],
    [mouse, fox],
    [mouse, owl],
    [squirrel, owl],
    [grasshopper, owl],
  ];
  return { organisms, arrows: pairs.map(([from, to]) => ({ id: newId(), from, to })) };
}

/** The first free grid cell (row by row, top first), or null if the grid is full. */
export function freeCell(organisms: readonly FoodWebOrganism[], preferRow = 0): { col: number; row: number } | null {
  const taken = new Set(organisms.map((o) => `${o.col}:${o.row}`));
  const rows = [preferRow, ...Array.from({ length: WEB_LIMITS.rows }, (_, r) => r).filter((r) => r !== preferRow)];
  for (const row of rows) for (let col = 0; col < WEB_LIMITS.cols; col++) if (!taken.has(`${col}:${row}`)) return { col, row };
  return null;
}

/** Moves an organism one cell, swapping with whoever is there. */
export function moveOrganism(web: Web, id: string, dCol: number, dRow: number): Web {
  const me = web.organisms.find((o) => o.id === id);
  if (!me) return web;
  const col = me.col + dCol;
  const row = me.row + dRow;
  if (col < 0 || row < 0 || col >= WEB_LIMITS.cols || row >= WEB_LIMITS.rows) return web;
  const other = web.organisms.find((o) => o.col === col && o.row === row);
  return {
    ...web,
    organisms: web.organisms.map((o) => (o.id === id ? { ...o, col, row } : other && o.id === other.id ? { ...o, col: me.col, row: me.row } : o)),
  };
}

/** Adds an arrow from → to (not twice, not to itself, not both ways). */
export function addArrow(web: Web, from: string, to: string, newId: () => string): Web {
  if (from === to || web.arrows.length >= WEB_LIMITS.arrows) return web;
  if (web.arrows.some((a) => (a.from === from && a.to === to) || (a.from === to && a.to === from))) return web;
  return { ...web, arrows: [...web.arrows, { id: newId(), from, to }] };
}

export function removeOrganism(web: Web, id: string): Web {
  return { organisms: web.organisms.filter((o) => o.id !== id), arrows: web.arrows.filter((a) => a.from !== id && a.to !== id) };
}

export type WebLayout = {
  width: number;
  height: number;
  centre: Map<string, { x: number; y: number }>;
  arrows: { id: string; x1: number; y1: number; x2: number; y2: number }[];
};

/**
 * Where the boxes and arrows are drawn. Each arrow runs from the edge of one
 * box to the edge of the other (a small gap on both ends).
 */
export function layoutWeb(web: Web): WebLayout {
  const { col, row, boxW, boxH, gap } = WEB_UNITS;
  const usedCols = Math.max(0, ...web.organisms.map((o) => o.col)) + 1;
  const usedRows = Math.max(0, ...web.organisms.map((o) => o.row)) + 1;
  const centre = new Map(web.organisms.map((o) => [o.id, { x: col / 2 + o.col * col, y: row / 2 + o.row * row }]));
  const arrows: WebLayout["arrows"] = [];
  const hw = boxW / 2 + gap;
  const hh = boxH / 2 + gap;
  for (const arrow of web.arrows) {
    const a = centre.get(arrow.from);
    const b = centre.get(arrow.to);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    // How far along the line the box edge is (as a part of the whole line).
    const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    if (t >= 0.5) continue; // boxes touch: no room for an arrow
    arrows.push({ id: arrow.id, x1: a.x + dx * t, y1: a.y + dy * t, x2: b.x - dx * t, y2: b.y - dy * t });
  }
  return { width: usedCols * col, height: usedRows * row, centre, arrows };
}

/** Splits a name into at most two lines of about `max` characters (at a space). */
export function twoLines(text: string, max = 12): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (text.length <= max || words.length < 2) return [text.trim()];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (diff < bestDiff) [best, bestDiff] = [i, diff];
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

// ---------------------------------------------------------------------------
// Pyramids
// ---------------------------------------------------------------------------

export type PyramidKind = "energy" | "biomass" | "numbers";

const LEVEL_NAMES = ["პროდუცენტები", "I რიგის კონსუმენტები", "II რიგის კონსუმენტები", "III რიგის კონსუმენტები"];

/** A ready pyramid (bottom first): the 10 % rule for energy, typical biomass, a numbers pyramid. */
export function samplePyramid(kind: PyramidKind, newId: () => string): PyramidLevel[] {
  const names = ["ბალახი", "კურდღელი", "მელა", "მგელი"];
  const values: Record<PyramidKind, string[]> = {
    energy: ["10 000 კჯ", "1 000 კჯ", "100 კჯ", "10 კჯ"],
    biomass: ["1 000 კგ", "100 კგ", "10 კგ", "1 კგ"],
    numbers: ["5 000", "200", "10", "1"],
  };
  return names.map((name, i) => ({ id: newId(), level: LEVEL_NAMES[i], name, value: values[kind][i], hide: i === 2 ? "value" : "none" }));
}

/** Width of each bar (bottom first), in % of the widest: 100, 78, 56, 34… */
export function pyramidWidths(count: number): number[] {
  const step = count > 1 ? Math.min(22, 70 / (count - 1)) : 0;
  return Array.from({ length: count }, (_, i) => 100 - i * step);
}
