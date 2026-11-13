/**
 * Diagram data: limits, starting diagrams, and repairing saved data
 * (like migrate.ts does for tests). Pure functions, no React.
 */
import { parseEdge } from "@/lib/gridEdges";
import { normalizeStructure } from "@/subjects/chemistry/structure/normalize";
import type { CircuitDiagram, CircuitElement, CircuitPart, Diagram, ForceArrow, ForceDiagram } from "@/lib/storage/types";

export const CIRCUIT_PARTS: readonly CircuitPart[] = [
  "wire",
  "battery",
  "resistor",
  "lamp",
  "switch-open",
  "switch-closed",
  "ammeter",
  "voltmeter",
];

/** Grid size limits, in squares. */
export const CIRCUIT_LIMITS = { minCols: 1, maxCols: 8, minRows: 1, maxRows: 6 };
export const INCLINE_LIMITS = { min: 15, max: 60 };
export const MAX_FORCES = 8;
export const MAX_LABEL = 12;

type Loose = Record<string, unknown>;
const isObject = (v: unknown): v is Loose => typeof v === "object" && v !== null;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const int = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback);
const label = (v: unknown) => (typeof v === "string" ? v.slice(0, MAX_LABEL) : "");

export { parseEdge } from "@/lib/gridEdges";

/** Keeps only the parts that are still inside a (smaller) grid. */
export function fitCircuit(circuit: CircuitDiagram, cols: number, rows: number): CircuitDiagram {
  return { ...circuit, cols, rows, elements: circuit.elements.filter((e) => parseEdge(e.at, cols, rows)) };
}

/** A new circuit: a simple loop with a battery, a switch and a lamp, ready to change. */
export function newCircuit(): CircuitDiagram {
  const el = (at: string, part: CircuitPart): CircuitElement => ({ at, part, label: "", flipped: false });
  return {
    kind: "circuit",
    cols: 3,
    rows: 2,
    elements: [
      el("h:0:0", "wire"),
      el("h:1:0", "battery"),
      el("h:2:0", "wire"),
      el("v:3:0", "wire"),
      el("v:3:1", "wire"),
      el("h:2:2", "wire"),
      el("h:1:2", "lamp"),
      el("h:0:2", "wire"),
      el("v:0:1", "switch-closed"),
      el("v:0:0", "wire"),
    ],
  };
}

/** A new force diagram: a box on the floor with gravity and the floor's push. */
export function newForceDiagram(labels: { gravity: string; normal: string }, makeId: () => string): ForceDiagram {
  return {
    kind: "forces",
    body: "box",
    surface: "floor",
    inclineAngle: 30,
    vectorLabels: true,
    forces: [
      { id: makeId(), angle: 270, length: 2, label: labels.gravity },
      { id: makeId(), angle: 90, length: 2, label: labels.normal },
    ],
  };
}

function normalizeCircuit(raw: Loose): CircuitDiagram | null {
  const cols = clamp(int(raw.cols, 3), CIRCUIT_LIMITS.minCols, CIRCUIT_LIMITS.maxCols);
  const rows = clamp(int(raw.rows, 2), CIRCUIT_LIMITS.minRows, CIRCUIT_LIMITS.maxRows);
  const seen = new Set<string>();
  const elements: CircuitElement[] = [];
  for (const e of Array.isArray(raw.elements) ? raw.elements : []) {
    if (!isObject(e) || typeof e.at !== "string" || seen.has(e.at)) continue;
    if (!parseEdge(e.at, cols, rows) || !CIRCUIT_PARTS.includes(e.part as CircuitPart)) continue;
    seen.add(e.at);
    elements.push({ at: e.at, part: e.part as CircuitPart, label: label(e.label), flipped: e.flipped === true });
  }
  return { kind: "circuit", cols, rows, elements };
}

function normalizeForces(raw: Loose): ForceDiagram {
  const forces: ForceArrow[] = (Array.isArray(raw.forces) ? raw.forces : [])
    .filter(isObject)
    .filter((f) => typeof f.id === "string")
    .slice(0, MAX_FORCES)
    .map((f) => ({
      id: f.id as string,
      angle: ((int(f.angle, 0) % 360) + 360) % 360,
      length: clamp(int(f.length, 2), 1, 3) as 1 | 2 | 3,
      label: label(f.label),
    }));
  return {
    kind: "forces",
    body: raw.body === "ball" ? "ball" : "box",
    surface: raw.surface === "none" || raw.surface === "incline" ? raw.surface : "floor",
    inclineAngle: clamp(int(raw.inclineAngle, 30), INCLINE_LIMITS.min, INCLINE_LIMITS.max),
    vectorLabels: raw.vectorLabels !== false,
    forces,
  };
}

/** A complete, valid diagram, or null if `raw` isn't one. */
export function normalizeDiagram(raw: unknown): Diagram | null {
  if (!isObject(raw)) return null;
  if (raw.kind === "circuit") return normalizeCircuit(raw);
  if (raw.kind === "forces") return normalizeForces(raw);
  if (raw.kind === "structure") return normalizeStructure(raw);
  return null;
}
