/**
 * Grids of dots used by diagrams (circuits, structural formulas): a "gap"
 * between two neighbouring dots is written "h:x:y" (from dot x,y to the dot
 * on its right) or "v:x:y" (to the dot below it).
 */

/** "h:2:1" → { dir: "h", x: 2, y: 1 }, or null if it isn't a gap of this grid. */
export function parseEdge(at: string, cols: number, rows: number): { dir: "h" | "v"; x: number; y: number } | null {
  const match = /^([hv]):(\d+):(\d+)$/.exec(at);
  if (!match) return null;
  const dir = match[1] as "h" | "v";
  const x = Number(match[2]);
  const y = Number(match[3]);
  const ok = dir === "h" ? x < cols && y <= rows : x <= cols && y < rows;
  return ok ? { dir, x, y } : null;
}
