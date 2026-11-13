/**
 * Where atoms and bonds of a structural formula go (pure numbers).
 */
import type { StructureDiagram } from "@/lib/storage/types";
import { parseEdge } from "@/lib/gridEdges";
import { parsePoint } from "./normalize";

export const STRUCT_CELL = 54;
export const STRUCT_PAD = 22;
export const STRUCT_FONT = 19;

export const structurePoint = (x: number, y: number) => ({ x: STRUCT_PAD + x * STRUCT_CELL, y: STRUCT_PAD + y * STRUCT_CELL });

/** Every dot of the grid, as "x:y". */
export function allPoints(cols: number, rows: number): string[] {
  const points: string[] = [];
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) points.push(`${x}:${y}`);
  return points;
}

/** A bond's line, shortened at the ends where an atom's letter is, plus its direction. */
export function bondLine(structure: StructureDiagram, at: string) {
  const edge = parseEdge(at, structure.cols, structure.rows);
  if (!edge) return null;
  const a = { x: edge.x, y: edge.y };
  const b = edge.dir === "h" ? { x: edge.x + 1, y: edge.y } : { x: edge.x, y: edge.y + 1 };
  const hasAtom = (p: { x: number; y: number }) => structure.atoms.some((atom) => atom.at === `${p.x}:${p.y}`);
  const start = structurePoint(a.x, a.y);
  const end = structurePoint(b.x, b.y);
  const gap = 13;
  const dx = edge.dir === "h" ? 1 : 0;
  const dy = edge.dir === "v" ? 1 : 0;
  return {
    x1: start.x + (hasAtom(a) ? gap * dx : 0),
    y1: start.y + (hasAtom(a) ? gap * dy : 0),
    x2: end.x - (hasAtom(b) ? gap * dx : 0),
    y2: end.y - (hasAtom(b) ? gap * dy : 0),
    vertical: edge.dir === "v",
  };
}

/** The area to show: the whole grid (editor) or just the molecule (paper). */
export function structureViewBox(structure: StructureDiagram, full: boolean) {
  const whole = { x: 0, y: 0, width: structure.cols * STRUCT_CELL + 2 * STRUCT_PAD, height: structure.rows * STRUCT_CELL + 2 * STRUCT_PAD };
  const points = [
    ...structure.atoms.map((a) => parsePoint(a.at, structure.cols, structure.rows)),
    ...structure.bonds.flatMap((b) => {
      const edge = parseEdge(b.at, structure.cols, structure.rows);
      if (!edge) return [];
      return [{ x: edge.x, y: edge.y }, edge.dir === "h" ? { x: edge.x + 1, y: edge.y } : { x: edge.x, y: edge.y + 1 }];
    }),
  ].filter((p) => p !== null);
  if (full || points.length === 0) return whole;
  const xs = points.map((p) => structurePoint(p.x, p.y).x);
  const ys = points.map((p) => structurePoint(p.x, p.y).y);
  // Room for wide labels like "COOH" on the sides.
  const longest = Math.max(1, ...structure.atoms.map((a) => a.label.length));
  const side = Math.max(STRUCT_PAD, longest * STRUCT_FONT * 0.35 + 6);
  const x = Math.min(...xs) - side;
  const y = Math.min(...ys) - STRUCT_PAD;
  return { x, y, width: Math.max(...xs) + side - x, height: Math.max(...ys) + STRUCT_PAD - y };
}
