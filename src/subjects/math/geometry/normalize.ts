/**
 * Geometric figures: starting figures, changing the shape, and repairing
 * saved data (like migrate.ts does for tests). Pure functions, no React.
 */
import type { GeometryDiagram, GeometryShape, TrianglePreset } from "@/lib/storage/types";
import { sideCount, vertexCount } from "./geometry";

export const GEOMETRY_SHAPES: readonly GeometryShape[] = ["triangle", "square", "rectangle", "circle", "parallelogram", "trapezoid"];
export const TRIANGLE_PRESETS: readonly TrianglePreset[] = ["general", "right", "isosceles", "equilateral"];
/** Longest letter at a corner ("A", "A1") and longest side label ("12,5 სმ"). */
export const GEOMETRY_LIMITS = { vertex: 3, label: 12 };

const LETTERS = ["A", "B", "C", "D"];
const defaultVertices = (shape: GeometryShape) => (shape === "circle" ? ["O"] : LETTERS.slice(0, vertexCount(shape)));

/** A ready figure with letters and no side labels: it can be inserted as it is. */
export function newGeometry(shape: GeometryShape = "triangle", triangle: TrianglePreset = "general"): GeometryDiagram {
  return {
    kind: "geometry",
    shape,
    triangle,
    showVertices: true,
    vertices: defaultVertices(shape),
    sides: Array.from({ length: sideCount(shape) }, () => ""),
    radius: true,
    radiusLabel: "r",
    rightAngle: true,
  };
}

/**
 * The same figure as another shape. Letters and side labels the teacher
 * already typed are kept where the new shape has a place for them.
 */
export function withShape(diagram: GeometryDiagram, shape: GeometryShape, triangle: TrianglePreset = diagram.triangle): GeometryDiagram {
  if (shape === diagram.shape) return { ...diagram, triangle };
  const fresh = newGeometry(shape, triangle);
  const keep = shape !== "circle" && diagram.shape !== "circle";
  return {
    ...fresh,
    showVertices: diagram.showVertices,
    radius: diagram.radius,
    radiusLabel: diagram.radiusLabel,
    rightAngle: diagram.rightAngle,
    vertices: keep ? fresh.vertices.map((letter, i) => diagram.vertices[i] ?? letter) : fresh.vertices,
    sides: keep ? fresh.sides.map((_, i) => diagram.sides[i] ?? "") : fresh.sides,
  };
}

/** One line of text, trimmed to its limit. */
export const cleanLabel = (value: unknown, max: number) =>
  typeof value === "string" ? [...value.replace(/\s+/g, " ").trimStart()].slice(0, max).join("") : "";

/** A complete, valid figure from saved data (unknown shape → null). */
export function normalizeGeometry(raw: Record<string, unknown>): GeometryDiagram | null {
  if (!GEOMETRY_SHAPES.includes(raw.shape as GeometryShape)) return null;
  const shape = raw.shape as GeometryShape;
  const triangle = TRIANGLE_PRESETS.includes(raw.triangle as TrianglePreset) ? (raw.triangle as TrianglePreset) : "general";
  const fresh = newGeometry(shape, triangle);
  const list = (value: unknown, defaults: string[], max: number) => {
    const saved = Array.isArray(value) ? value : [];
    return defaults.map((fallback, i) => (typeof saved[i] === "string" ? cleanLabel(saved[i], max).trimEnd() : fallback));
  };
  return {
    kind: "geometry",
    shape,
    triangle,
    showVertices: raw.showVertices !== false,
    vertices: list(raw.vertices, fresh.vertices, GEOMETRY_LIMITS.vertex),
    sides: list(raw.sides, fresh.sides, GEOMETRY_LIMITS.label),
    radius: raw.radius !== false,
    radiusLabel: typeof raw.radiusLabel === "string" ? cleanLabel(raw.radiusLabel, GEOMETRY_LIMITS.label).trimEnd() : fresh.radiusLabel,
    rightAngle: raw.rightAngle !== false,
  };
}
