/**
 * Draws a structural formula: bonds as 1, 2 or 3 lines, atoms as letters
 * (digits small and low: CH3 → CH₃). Black on white, in the page font.
 */
import type { StructureDiagram } from "@/lib/storage/types";
import { STRUCT_FONT, bondLine, structurePoint, structureViewBox } from "./geometry";
import { parsePoint } from "./normalize";

const INK = "#000";

/** "CH3" → C, H, and a small 3. */
function AtomLabel({ x, y, label }: { x: number; y: number; label: string }) {
  const parts = label.match(/\d+|\D+/g) ?? [];
  return (
    <text x={x} y={y} fontSize={STRUCT_FONT} textAnchor="middle" dominantBaseline="central" fill={INK}>
      {parts.map((part, i) =>
        /^\d+$/.test(part) ? (
          <tspan key={i} fontSize={STRUCT_FONT * 0.68} dy={STRUCT_FONT * 0.28}>
            {part}
          </tspan>
        ) : (
          // After a subscript, come back up to the normal line.
          <tspan key={i} dy={i > 0 && /^\d+$/.test(parts[i - 1]) ? -STRUCT_FONT * 0.28 : undefined}>
            {part}
          </tspan>
        ),
      )}
    </text>
  );
}

/** The bonds and atoms only (the editor adds its grid and click areas). */
export function StructureDrawing({ structure }: { structure: StructureDiagram }) {
  return (
    <g stroke={INK} strokeWidth={1.8} strokeLinecap="round">
      {structure.bonds.map((bond) => {
        const line = bondLine(structure, bond.at);
        if (!line) return null;
        // Several parallel lines for double and triple bonds.
        const offsets = bond.order === 1 ? [0] : bond.order === 2 ? [-3.5, 3.5] : [-5.5, 0, 5.5];
        return offsets.map((offset) => (
          <line
            key={`${bond.at}${offset}`}
            x1={line.x1 + (line.vertical ? offset : 0)}
            y1={line.y1 + (line.vertical ? 0 : offset)}
            x2={line.x2 + (line.vertical ? offset : 0)}
            y2={line.y2 + (line.vertical ? 0 : offset)}
          />
        ));
      })}
      <g stroke="none">
        {structure.atoms.map((atom) => {
          const point = parsePoint(atom.at, structure.cols, structure.rows);
          if (!point) return null;
          const { x, y } = structurePoint(point.x, point.y);
          return <AtomLabel key={atom.at} x={x} y={y} label={atom.label} />;
        })}
      </g>
    </g>
  );
}

export function StructureView({ structure, className }: { structure: StructureDiagram; className?: string }) {
  const box = structureViewBox(structure, false);
  return (
    <svg viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} className={className} style={{ display: "block", width: "100%", height: "auto" }} role="img">
      <StructureDrawing structure={structure} />
    </svg>
  );
}
