/**
 * Draws a diagram (circuit or forces) as SVG — vector graphics, so it stays
 * sharp at any size, on screen, on paper and in the PDF. Always black on
 * white (it sits on paper). The text uses the page's font (Noto Sans
 * Georgian), so Georgian labels like "F_ხ" look right.
 */
import type { CircuitDiagram, CircuitElement, CircuitPart, Diagram, ForceDiagram } from "@/lib/storage/types";
import { structureViewBox } from "@/subjects/chemistry/structure/geometry";
import { StructureView } from "@/subjects/chemistry/structure/StructureView";
import { geometryLayout } from "@/subjects/math/geometry/geometry";
import { GeometryView } from "@/subjects/math/geometry/GeometryView";
import {
  BALL_RADIUS,
  BOX,
  CELL,
  CIRCUIT_FONT,
  FORCE_FONT,
  circuitViewBox,
  edgeEnds,
  forceLayout,
  junctions,
  labelParts,
  labelWidth,
  type ViewBox,
} from "./geometry";

const INK = "#000";
const vb = (box: ViewBox) => `${box.x} ${box.y} ${box.width} ${box.height}`;

/** The size (in SVG units) a diagram is drawn at on paper — used for its shape (aspect ratio). */
export function diagramSize(diagram: Diagram): { width: number; height: number } {
  const box =
    diagram.kind === "circuit"
      ? circuitViewBox(diagram, false)
      : diagram.kind === "structure"
        ? structureViewBox(diagram, false)
        : diagram.kind === "geometry"
          ? geometryLayout(diagram).viewBox
          : forceLayout(diagram).viewBox;
  return { width: Math.round(box.width), height: Math.round(box.height) };
}

export function DiagramView({ diagram, className }: { diagram: Diagram; className?: string }) {
  if (diagram.kind === "circuit") return <CircuitView circuit={diagram} className={className} />;
  if (diagram.kind === "structure") return <StructureView structure={diagram} className={className} />;
  if (diagram.kind === "geometry") return <GeometryView geometry={diagram} className={className} />;
  return <ForceView diagram={diagram} className={className} />;
}

// ---------------------------------------------------------------------------
// A label with an optional small part below ("R₁", "F_ხ") and an optional
// vector arrow above it.
// ---------------------------------------------------------------------------

export function DiagramLabel({
  x,
  y,
  text,
  fontSize,
  anchor = "middle",
  vector = false,
}: {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  anchor?: "start" | "middle";
  vector?: boolean;
}) {
  const { main, sub } = labelParts(text);
  if (!main) return null;
  const mainWidth = main.length * fontSize * 0.62;
  const left = anchor === "middle" ? x - labelWidth(text, fontSize) / 2 : x;
  const arrowY = y - fontSize * 0.95;
  return (
    <g>
      <text x={x} y={y} fontSize={fontSize} textAnchor={anchor} dominantBaseline="middle" fill={INK} fontStyle="italic">
        {main}
        {sub && (
          <tspan fontSize={fontSize * 0.7} dy={fontSize * 0.3} fontStyle="normal">
            {sub}
          </tspan>
        )}
      </text>
      {vector && (
        // A small arrow over the main letters: →
        <g stroke={INK} strokeWidth={1.2} fill="none">
          <line x1={left + 1} y1={arrowY} x2={left + mainWidth} y2={arrowY} />
          <polyline points={`${left + mainWidth - 4},${arrowY - 3} ${left + mainWidth},${arrowY} ${left + mainWidth - 4},${arrowY + 3}`} />
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Circuits
// ---------------------------------------------------------------------------

/**
 * One part drawn lying flat, from (0,0) to (CELL,0). Vertical parts are the
 * same drawing turned by 90°. Letters (A, V) are drawn separately, upright.
 */
export function PartShape({ part, flipped = false }: { part: CircuitPart; flipped?: boolean }) {
  const c = CELL / 2;
  const lead = (gap: number) => (
    <>
      <line x1={0} y1={0} x2={c - gap} y2={0} />
      <line x1={c + gap} y1={0} x2={CELL} y2={0} />
    </>
  );
  switch (part) {
    case "wire":
      return <line x1={0} y1={0} x2={CELL} y2={0} />;
    case "battery": {
      // Long thin plate = +, short thick plate = −.
      const long = flipped ? c + 5 : c - 5;
      const short = flipped ? c - 5 : c + 5;
      return (
        <>
          {lead(5)}
          <line x1={long} y1={-15} x2={long} y2={15} />
          <line x1={short} y1={-8} x2={short} y2={8} strokeWidth={5} />
        </>
      );
    }
    case "resistor":
      return (
        <>
          {lead(17)}
          <rect x={c - 17} y={-7} width={34} height={14} fill="#fff" />
        </>
      );
    case "lamp":
      return (
        <>
          {lead(12)}
          <circle cx={c} cy={0} r={12} fill="#fff" />
          <line x1={c - 8.5} y1={-8.5} x2={c + 8.5} y2={8.5} />
          <line x1={c - 8.5} y1={8.5} x2={c + 8.5} y2={-8.5} />
        </>
      );
    case "switch-open":
    case "switch-closed":
      return (
        <>
          {lead(14)}
          <circle cx={c - 14} cy={0} r={2.5} fill={INK} />
          <circle cx={c + 14} cy={0} r={2.5} fill={INK} />
          <line x1={c - 14} y1={0} x2={c + 13} y2={part === "switch-open" ? -14 : -2.5} />
        </>
      );
    case "ammeter":
    case "voltmeter":
      return (
        <>
          {lead(13)}
          <circle cx={c} cy={0} r={13} fill="#fff" />
        </>
      );
  }
}

function CircuitElementShape({ element, circuit }: { element: CircuitElement; circuit: CircuitDiagram }) {
  const ends = edgeEnds(element.at, circuit.cols, circuit.rows);
  if (!ends) return null;
  const [start, end] = ends;
  const vertical = start.x === end.x;
  const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const letter = element.part === "ammeter" ? "A" : element.part === "voltmeter" ? "V" : null;
  return (
    <g>
      <g transform={`translate(${start.x} ${start.y})${vertical ? " rotate(90)" : ""}`}>
        <PartShape part={element.part} flipped={element.flipped} />
      </g>
      {letter && (
        <text x={center.x} y={center.y + 0.5} fontSize={15} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill={INK} stroke="none">
          {letter}
        </text>
      )}
      {element.label && (
        <g stroke="none">
          {vertical ? (
            <DiagramLabel x={center.x + 22} y={center.y} text={element.label} fontSize={CIRCUIT_FONT} anchor="start" />
          ) : (
            <DiagramLabel x={center.x} y={center.y - 24} text={element.label} fontSize={CIRCUIT_FONT} />
          )}
        </g>
      )}
    </g>
  );
}

/** The wires and parts only (the editor adds its grid and click areas around this). */
export function CircuitDrawing({ circuit }: { circuit: CircuitDiagram }) {
  return (
    <g stroke={INK} strokeWidth={2} strokeLinecap="round" fill="none">
      {circuit.elements.map((element) => (
        <CircuitElementShape key={element.at} element={element} circuit={circuit} />
      ))}
      {junctions(circuit).map((p) => (
        <circle key={`${p.x}:${p.y}`} cx={p.x} cy={p.y} r={4} fill={INK} stroke="none" />
      ))}
    </g>
  );
}

function CircuitView({ circuit, className }: { circuit: CircuitDiagram; className?: string }) {
  const box = circuitViewBox(circuit, false);
  return (
    <svg viewBox={vb(box)} className={className} style={{ display: "block", width: "100%", height: "auto" }} role="img">
      <CircuitDrawing circuit={circuit} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Forces
// ---------------------------------------------------------------------------

/** The body, the surface and the arrows, drawn around (0, 0). */
export function ForceDrawing({ diagram }: { diagram: ForceDiagram }) {
  const layout = forceLayout(diagram);
  return (
    <g stroke={INK} strokeWidth={2} fill="none" strokeLinejoin="round">
      {layout.floor && (
        <g>
          <line x1={layout.floor[0].x} y1={layout.floor[0].y} x2={layout.floor[1].x} y2={layout.floor[1].y} />
          {/* Hatching under the floor */}
          {Array.from({ length: 10 }, (_, i) => {
            const x = layout.floor![0].x + 10 + i * 19;
            const y = layout.floor![0].y;
            return <line key={i} x1={x} y1={y} x2={x - 9} y2={y + 9} strokeWidth={1.2} />;
          })}
        </g>
      )}
      {layout.incline && (
        <g>
          <polygon points={layout.incline.map((p) => `${p.x},${p.y}`).join(" ")} fill="#fff" />
          {/* The angle at the bottom, marked with an arc and its size */}
          <path
            d={`M ${layout.incline[0].x + 34} ${layout.incline[0].y} A 34 34 0 0 0 ${layout.incline[0].x + 34 * Math.cos((diagram.inclineAngle * Math.PI) / 180)} ${layout.incline[0].y - 34 * Math.sin((diagram.inclineAngle * Math.PI) / 180)}`}
            strokeWidth={1.2}
          />
          <text
            x={layout.incline[0].x + 46 * Math.cos((diagram.inclineAngle * Math.PI) / 360)}
            y={layout.incline[0].y - 46 * Math.sin((diagram.inclineAngle * Math.PI) / 360)}
            fontSize={13}
            dominantBaseline="middle"
            fill={INK}
            stroke="none"
          >
            {diagram.inclineAngle}°
          </text>
        </g>
      )}
      <g transform={`rotate(${layout.bodyRotation})`}>
        {diagram.body === "ball" ? (
          <circle cx={0} cy={0} r={BALL_RADIUS} fill="#fff" />
        ) : (
          <rect x={-BOX.width / 2} y={-BOX.height / 2} width={BOX.width} height={BOX.height} fill="#fff" />
        )}
      </g>
      {layout.arrows.map((arrow) => (
        <g key={arrow.id}>
          <Arrow tip={arrow.tip} />
          <g stroke="none">
            <DiagramLabel x={arrow.labelAt.x} y={arrow.labelAt.y} text={arrow.label} fontSize={FORCE_FONT} vector={diagram.vectorLabels} />
          </g>
        </g>
      ))}
      <circle cx={0} cy={0} r={3} fill={INK} stroke="none" />
    </g>
  );
}

/** A thick arrow from the centre (0, 0) to `tip`. */
function Arrow({ tip }: { tip: { x: number; y: number } }) {
  const length = Math.hypot(tip.x, tip.y) || 1;
  const ux = tip.x / length;
  const uy = tip.y / length;
  const head = 12;
  const base = { x: tip.x - ux * head, y: tip.y - uy * head };
  const side = { x: -uy * 5.5, y: ux * 5.5 };
  return (
    <g>
      <line x1={0} y1={0} x2={base.x} y2={base.y} strokeWidth={2.4} />
      <polygon points={`${tip.x},${tip.y} ${base.x + side.x},${base.y + side.y} ${base.x - side.x},${base.y - side.y}`} fill={INK} stroke="none" />
    </g>
  );
}

function ForceView({ diagram, className }: { diagram: ForceDiagram; className?: string }) {
  const { viewBox } = forceLayout(diagram);
  return (
    <svg viewBox={vb(viewBox)} className={className} style={{ display: "block", width: "100%", height: "auto" }} role="img">
      <ForceDrawing diagram={diagram} />
    </svg>
  );
}
