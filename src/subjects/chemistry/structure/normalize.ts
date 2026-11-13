/**
 * Structural formulas: limits, ready-made molecules, and repairing saved
 * data. Pure functions, no React.
 */
import type { StructureDiagram } from "@/lib/storage/types";
import { parseEdge } from "@/lib/gridEdges";

export const STRUCTURE_LIMITS = { minCols: 1, maxCols: 10, minRows: 1, maxRows: 6, label: 6 };

/** "2:1" → { x: 2, y: 1 } if it's a dot of this grid. */
export function parsePoint(at: string, cols: number, rows: number): { x: number; y: number } | null {
  const match = /^(\d+):(\d+)$/.exec(at);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  return x <= cols && y <= rows ? { x, y } : null;
}

type Loose = Record<string, unknown>;
const isObject = (v: unknown): v is Loose => typeof v === "object" && v !== null;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const int = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback);

export function normalizeStructure(raw: Loose): StructureDiagram {
  const cols = clamp(int(raw.cols, 4), STRUCTURE_LIMITS.minCols, STRUCTURE_LIMITS.maxCols);
  const rows = clamp(int(raw.rows, 2), STRUCTURE_LIMITS.minRows, STRUCTURE_LIMITS.maxRows);
  const seen = new Set<string>();
  const atoms = (Array.isArray(raw.atoms) ? raw.atoms : [])
    .filter(isObject)
    .filter((a) => typeof a.at === "string" && typeof a.label === "string" && a.label.trim() && parsePoint(a.at, cols, rows) && !seen.has(a.at) && seen.add(a.at))
    .map((a) => ({ at: a.at as string, label: (a.label as string).trim().slice(0, STRUCTURE_LIMITS.label) }));
  const seenBonds = new Set<string>();
  const bonds = (Array.isArray(raw.bonds) ? raw.bonds : [])
    .filter(isObject)
    .filter((b) => typeof b.at === "string" && parseEdge(b.at, cols, rows) && !seenBonds.has(b.at) && seenBonds.add(b.at))
    .map((b) => ({ at: b.at as string, order: clamp(int(b.order, 1), 1, 3) as 1 | 2 | 3 }));
  return { kind: "structure", cols, rows, atoms, bonds };
}

/** Keeps only the atoms and bonds that still fit a smaller grid. */
export function fitStructure(structure: StructureDiagram, cols: number, rows: number): StructureDiagram {
  return {
    ...structure,
    cols,
    rows,
    atoms: structure.atoms.filter((a) => parsePoint(a.at, cols, rows)),
    bonds: structure.bonds.filter((b) => parseEdge(b.at, cols, rows)),
  };
}

/** A molecule from a compact description: atoms [x, y, label] and bonds [gap, order]. */
function molecule(cols: number, rows: number, atoms: [number, number, string][], bonds: [string, 1 | 2 | 3][]): StructureDiagram {
  return {
    kind: "structure",
    cols,
    rows,
    atoms: atoms.map(([x, y, label]) => ({ at: `${x}:${y}`, label })),
    bonds: bonds.map(([at, order]) => ({ at, order })),
  };
}

/** H above and below a carbon at column x (row 1), with their bonds. */
const hAboveBelow = (x: number): { atoms: [number, number, string][]; bonds: [string, 1][] } => ({
  atoms: [
    [x, 0, "H"],
    [x, 2, "H"],
  ],
  bonds: [
    [`v:${x}:0`, 1],
    [`v:${x}:1`, 1],
  ],
});

/** Ready-made molecules teachers start from (expanded structural formulas). */
export type StructureTemplateId = "methane" | "ethane" | "ethene" | "ethyne" | "ethanol" | "acetic-acid";
export const STRUCTURE_TEMPLATES: { id: StructureTemplateId; make: () => StructureDiagram }[] = [
  {
    id: "methane",
    make: () => molecule(2, 2, [[1, 1, "C"], [0, 1, "H"], [2, 1, "H"], ...hAboveBelow(1).atoms], [["h:0:1", 1], ["h:1:1", 1], ...hAboveBelow(1).bonds]),
  },
  {
    id: "ethane",
    make: () =>
      molecule(
        3,
        2,
        [[0, 1, "H"], [1, 1, "C"], [2, 1, "C"], [3, 1, "H"], ...hAboveBelow(1).atoms, ...hAboveBelow(2).atoms],
        [["h:0:1", 1], ["h:1:1", 1], ["h:2:1", 1], ...hAboveBelow(1).bonds, ...hAboveBelow(2).bonds],
      ),
  },
  {
    id: "ethene",
    make: () =>
      molecule(
        3,
        2,
        [[1, 1, "C"], [2, 1, "C"], ...hAboveBelow(1).atoms, ...hAboveBelow(2).atoms],
        [["h:1:1", 2], ...hAboveBelow(1).bonds, ...hAboveBelow(2).bonds],
      ),
  },
  {
    id: "ethyne",
    make: () => molecule(3, 1, [[0, 0, "H"], [1, 0, "C"], [2, 0, "C"], [3, 0, "H"]], [["h:0:0", 1], ["h:1:0", 3], ["h:2:0", 1]]),
  },
  {
    id: "ethanol",
    make: () =>
      molecule(
        4,
        2,
        [[0, 1, "H"], [1, 1, "C"], [2, 1, "C"], [3, 1, "O"], [4, 1, "H"], ...hAboveBelow(1).atoms, ...hAboveBelow(2).atoms],
        [["h:0:1", 1], ["h:1:1", 1], ["h:2:1", 1], ["h:3:1", 1], ...hAboveBelow(1).bonds, ...hAboveBelow(2).bonds],
      ),
  },
  {
    id: "acetic-acid",
    make: () =>
      molecule(
        4,
        2,
        [[0, 1, "H"], [1, 1, "C"], [2, 1, "C"], [3, 1, "O"], [4, 1, "H"], [2, 0, "O"], ...hAboveBelow(1).atoms],
        [["h:0:1", 1], ["h:1:1", 1], ["h:2:1", 1], ["h:3:1", 1], ["v:2:0", 2], ...hAboveBelow(1).bonds],
      ),
  },
];

/** A new structure: starts as methane, ready to change. */
export const newStructure = () => STRUCTURE_TEMPLATES[0].make();
