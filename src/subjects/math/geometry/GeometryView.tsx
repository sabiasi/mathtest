/**
 * Draws a geometric figure as SVG: thin black lines on white, letters and
 * labels in the page font. The same drawing is used in the editor preview,
 * on paper and in the PDF.
 */
import type { GeometryDiagram } from "@/lib/storage/types";
import { GEOMETRY_FONT, geometryLayout, type PlacedLabel } from "./geometry";

const INK = "#000";

function Label({ label, italic }: { label: PlacedLabel; italic?: boolean }) {
  return (
    <text x={label.x} y={label.y} fontSize={GEOMETRY_FONT} textAnchor="middle" dominantBaseline="central" fill={INK} fontStyle={italic ? "italic" : undefined} className="font-sans">
      {label.text}
    </text>
  );
}

/** `bold` = thicker lines, for the small pictures on the shape buttons. */
export function GeometryView({ geometry, className, bold = false }: { geometry: GeometryDiagram; className?: string; bold?: boolean }) {
  const { viewBox, points, circle, rightAngle, vertexLabels, sideLabels } = geometryLayout(geometry);
  const path = (list: { x: number; y: number }[]) => list.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <svg
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      className={className}
      style={{ display: "block", width: "100%", height: "auto" }}
      role="img"
      data-geometry-figure={geometry.shape}
    >
      <g fill="none" stroke={INK} strokeWidth={bold ? 7 : 1.6} strokeLinejoin="round" strokeLinecap="round">
        {points.length > 0 && <polygon points={path(points)} />}
        {rightAngle && <polyline points={path(rightAngle)} strokeWidth={1.1} data-right-angle="" />}
        {circle && <circle cx={circle.center.x} cy={circle.center.y} r={circle.r} />}
        {circle?.radiusEnd && <line x1={circle.center.x} y1={circle.center.y} x2={circle.radiusEnd.x} y2={circle.radiusEnd.y} strokeWidth={1.3} data-radius="" />}
      </g>
      {circle?.showCenter && <circle cx={circle.center.x} cy={circle.center.y} r={2.2} fill={INK} />}
      {vertexLabels.map((label, i) => (
        <Label key={`v${i}`} label={label} italic />
      ))}
      {sideLabels.map((label, i) => (
        <Label key={`s${i}`} label={label} />
      ))}
    </svg>
  );
}
