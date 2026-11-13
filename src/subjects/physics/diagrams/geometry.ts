/**
 * Where everything in a diagram goes, as plain numbers (no React). The
 * drawing (DiagramView.tsx) only turns these numbers into SVG shapes.
 *
 * Units are SVG units; the whole drawing is scaled to the width the teacher
 * picks, so only proportions matter.
 */
import type { CircuitDiagram, ForceDiagram } from "@/lib/storage/types";
import { parseEdge } from "./normalize";

export type Point = { x: number; y: number };
export type ViewBox = { x: number; y: number; width: number; height: number };

// ---------------------------------------------------------------------------
// Labels: "R1" → R with a small 1 below; "F_ხ" → F with a small ხ below.
// ---------------------------------------------------------------------------

export function labelParts(label: string): { main: string; sub: string } {
  const text = label.trim();
  const underscore = text.indexOf("_");
  if (underscore > 0) return { main: text.slice(0, underscore), sub: text.slice(underscore + 1) };
  const digits = /^(\p{L}+)(\d+)$/u.exec(text);
  if (digits) return { main: digits[1], sub: digits[2] };
  return { main: text, sub: "" };
}

/** Rough width of a label in SVG units (for fitting the drawing around it). */
export function labelWidth(label: string, fontSize: number): number {
  const { main, sub } = labelParts(label);
  return (main.length + sub.length * 0.7) * fontSize * 0.62;
}

// ---------------------------------------------------------------------------
// Circuits
// ---------------------------------------------------------------------------

export const CELL = 70;
export const CIRCUIT_PAD = 34;
export const CIRCUIT_FONT = 15;

/** The position of grid dot (x, y). */
export function dotPoint(x: number, y: number): Point {
  return { x: CIRCUIT_PAD + x * CELL, y: CIRCUIT_PAD + y * CELL };
}

/** Every gap of the grid, as "h:x:y" / "v:x:y". */
export function allEdges(cols: number, rows: number): string[] {
  const edges: string[] = [];
  for (let y = 0; y <= rows; y++) for (let x = 0; x < cols; x++) edges.push(`h:${x}:${y}`);
  for (let y = 0; y < rows; y++) for (let x = 0; x <= cols; x++) edges.push(`v:${x}:${y}`);
  return edges;
}

/** Start and end dot of a gap. */
export function edgeEnds(at: string, cols: number, rows: number): [Point, Point] | null {
  const edge = parseEdge(at, cols, rows);
  if (!edge) return null;
  const start = dotPoint(edge.x, edge.y);
  return [start, edge.dir === "h" ? dotPoint(edge.x + 1, edge.y) : dotPoint(edge.x, edge.y + 1)];
}

/** Dots where three or four wires meet: drawn as a filled dot (a junction). */
export function junctions(circuit: CircuitDiagram): Point[] {
  const count = new Map<string, number>();
  for (const element of circuit.elements) {
    const edge = parseEdge(element.at, circuit.cols, circuit.rows);
    if (!edge) continue;
    const ends = edge.dir === "h" ? [[edge.x, edge.y], [edge.x + 1, edge.y]] : [[edge.x, edge.y], [edge.x, edge.y + 1]];
    for (const [x, y] of ends) count.set(`${x}:${y}`, (count.get(`${x}:${y}`) ?? 0) + 1);
  }
  return [...count]
    .filter(([, n]) => n >= 3)
    .map(([key]) => {
      const [x, y] = key.split(":").map(Number);
      return dotPoint(x, y);
    });
}

/**
 * The area to show. `full` (the editor) = the whole grid; otherwise (paper)
 * only the part that has something on it, so empty grid rows don't waste space.
 */
export function circuitViewBox(circuit: CircuitDiagram, full: boolean): ViewBox {
  const whole = { x: 0, y: 0, width: circuit.cols * CELL + 2 * CIRCUIT_PAD, height: circuit.rows * CELL + 2 * CIRCUIT_PAD };
  const points = circuit.elements.flatMap((e) => edgeEnds(e.at, circuit.cols, circuit.rows) ?? []);
  if (full || points.length === 0) return whole;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  // Room for labels: above horizontal parts, right of vertical ones.
  const pad = CIRCUIT_PAD;
  const right = Math.max(
    ...circuit.elements.map((e) => {
      const ends = edgeEnds(e.at, circuit.cols, circuit.rows);
      if (!ends || !e.label || ends[0].x !== ends[1].x) return 0;
      return ends[0].x + 22 + labelWidth(e.label, CIRCUIT_FONT) + 4;
    }),
  );
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, width: Math.max(Math.max(...xs) + pad, right) - x, height: Math.max(...ys) + pad - y };
}

// ---------------------------------------------------------------------------
// Forces
// ---------------------------------------------------------------------------

export const FORCE_FONT = 17;
export const ARROW_LENGTHS = { 1: 45, 2: 70, 3: 95 } as const;
export const BOX = { width: 56, height: 40 };
export const BALL_RADIUS = 22;

const rad = (degrees: number) => (degrees * Math.PI) / 180;
/** Direction in degrees (0 = right, 90 = up) → a step on screen (SVG's y points down). */
export function direction(angle: number): Point {
  return { x: Math.cos(rad(angle)), y: -Math.sin(rad(angle)) };
}
/** Two decimals; "+ 0" turns -0 (a JavaScript oddity) into 0. */
const round = (n: number) => Math.round(n * 100) / 100 + 0;

export type ForceLayout = {
  /** Rotation of the body in degrees (SVG: negative = counter-clockwise). */
  bodyRotation: number;
  /** The ground line (floor), or the three corners of the incline. */
  floor: [Point, Point] | null;
  incline: [Point, Point, Point] | null;
  arrows: { id: string; tip: Point; labelAt: Point; label: string }[];
  viewBox: ViewBox;
};

/** The body's centre is always (0, 0); everything else is placed around it. */
export function forceLayout(diagram: ForceDiagram): ForceLayout {
  const halfHeight = diagram.body === "ball" ? BALL_RADIUS : BOX.height / 2;
  let floor: ForceLayout["floor"] = null;
  let incline: ForceLayout["incline"] = null;
  let bodyRotation = 0;

  if (diagram.surface === "floor") {
    floor = [
      { x: -100, y: halfHeight },
      { x: 100, y: halfHeight },
    ];
  } else if (diagram.surface === "incline") {
    const a = diagram.inclineAngle;
    bodyRotation = -a;
    const along = direction(a); // up the slope
    const normal = direction(a + 90); // away from the slope
    const contact = { x: -normal.x * halfHeight, y: -normal.y * halfHeight };
    const bottom = { x: round(contact.x - along.x * 120), y: round(contact.y - along.y * 120) };
    const top = { x: round(contact.x + along.x * 100), y: round(contact.y + along.y * 100) };
    incline = [bottom, top, { x: top.x, y: bottom.y }];
  }

  const arrows = diagram.forces.map((force) => {
    const step = direction(force.angle);
    const length = ARROW_LENGTHS[force.length];
    return {
      id: force.id,
      label: force.label,
      tip: { x: round(step.x * length), y: round(step.y * length) },
      labelAt: { x: round(step.x * (length + 16)), y: round(step.y * (length + 16)) },
    };
  });

  // Fit the drawing around everything, with a little margin.
  const points: Point[] = [
    { x: -BOX.width / 2 - 4, y: -halfHeight - 12 },
    { x: BOX.width / 2 + 4, y: halfHeight + 12 },
    ...(floor ?? []),
    ...(incline ?? []),
    ...arrows.map((a) => a.tip),
  ];
  for (const arrow of arrows) {
    if (!arrow.label) continue;
    const half = labelWidth(arrow.label, FORCE_FONT) / 2 + 2;
    points.push({ x: arrow.labelAt.x - half, y: arrow.labelAt.y - FORCE_FONT }, { x: arrow.labelAt.x + half, y: arrow.labelAt.y + FORCE_FONT * 0.7 });
  }
  if (floor) points.push({ x: floor[0].x, y: floor[0].y + 12 });
  const margin = 10;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.floor(Math.min(...xs) - margin);
  const y = Math.floor(Math.min(...ys) - margin);
  const viewBox = { x, y, width: Math.ceil(Math.max(...xs) + margin - x), height: Math.ceil(Math.max(...ys) + margin - y) };
  return { bodyRotation, floor, incline, arrows, viewBox };
}

/**
 * Directions for the quick "add a force" buttons, so they point the right
 * way on a floor or an incline (N is at right angles to the surface,
 * friction along it, against sliding down).
 */
export function presetAngle(kind: "gravity" | "normal" | "friction" | "push" | "tension", diagram: ForceDiagram): number {
  const a = diagram.surface === "incline" ? diagram.inclineAngle : 0;
  switch (kind) {
    case "gravity":
      return 270;
    case "normal":
      return 90 + a;
    case "friction":
      return diagram.surface === "incline" ? a : 180;
    case "push":
      return diagram.surface === "incline" ? 180 + a : 0;
    case "tension":
      return 90;
  }
}

/**
 * When the surface or the incline angle changes, the usual forces turn with
 * it: an arrow pointing exactly where N / friction / pull pointed before now
 * points where it should on the new surface. Forces the teacher aimed
 * themselves (any other angle) stay as they are; gravity is always down.
 */
export function reorientForces(before: ForceDiagram, after: ForceDiagram): ForceDiagram {
  const kinds = ["normal", "friction", "push"] as const;
  const forces = after.forces.map((force) => {
    const kind = kinds.find((k) => presetAngle(k, before) === force.angle);
    return kind ? { ...force, angle: presetAngle(kind, after) } : force;
  });
  return { ...after, forces };
}
