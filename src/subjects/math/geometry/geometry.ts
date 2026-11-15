/**
 * Geometric figures: where the corners are, where the letters and side
 * labels go, and how big the drawing is. Pure maths, no React — the editor
 * preview, the paper and the PDF all draw from `geometryLayout`.
 *
 * Units are SVG units (y grows downward). Corners go clockwise starting at
 * the bottom left: triangle A (left), B (top), C (right); four-sided figures
 * A (bottom left), B (top left), C (top right), D (bottom right).
 */
import type { GeometryDiagram, GeometryShape, TrianglePreset } from "@/lib/storage/types";

export interface Point {
  x: number;
  y: number;
}

export interface PlacedLabel {
  /** The centre of the text. */
  x: number;
  y: number;
  text: string;
  width: number;
  height: number;
}

export interface GeometryLayout {
  viewBox: { x: number; y: number; width: number; height: number };
  /** Corners of a straight-sided figure ([] for a circle). */
  points: Point[];
  circle: { center: Point; r: number; radiusEnd: Point | null; showCenter: boolean } | null;
  /** The three corners of the small right-angle square (drawn as two lines), or null. */
  rightAngle: Point[] | null;
  vertexLabels: PlacedLabel[];
  sideLabels: PlacedLabel[];
}

export const GEOMETRY_FONT = 15;
export const CIRCLE_RADIUS = 70;
const MARKER = 13;
const PADDING = 5;
const SQRT3 = Math.sqrt(3);

const TRIANGLES: Record<TrianglePreset, Point[]> = {
  // No two sides equal, no right angle.
  general: [
    { x: 0, y: 120 },
    { x: 55, y: 0 },
    { x: 190, y: 120 },
  ],
  // Legs 120 and 160 (a 3-4-5 triangle); the right angle is at C.
  right: [
    { x: 0, y: 0 },
    { x: 160, y: 120 },
    { x: 0, y: 120 },
  ],
  // AB = BC.
  isosceles: [
    { x: 0, y: 135 },
    { x: 65, y: 0 },
    { x: 130, y: 135 },
  ],
  equilateral: [
    { x: 0, y: 75 * SQRT3 },
    { x: 75, y: 0 },
    { x: 150, y: 75 * SQRT3 },
  ],
};

const box = (width: number, height: number, slantLeft = 0, slantRight = 0): Point[] => [
  { x: 0, y: height },
  { x: slantLeft, y: 0 },
  { x: width - slantRight, y: 0 },
  { x: width, y: height },
];

/** The corners of a straight-sided figure ([] for a circle). */
export function shapePoints(shape: GeometryShape, triangle: TrianglePreset): Point[] {
  switch (shape) {
    case "triangle":
      return TRIANGLES[triangle];
    case "square":
      return box(130, 130);
    case "rectangle":
      return box(200, 115);
    case "parallelogram":
      // The top side is moved 45 to the right: opposite sides stay parallel and equal.
      return [
        { x: 0, y: 110 },
        { x: 45, y: 0 },
        { x: 225, y: 0 },
        { x: 180, y: 110 },
      ];
    case "trapezoid":
      return box(210, 110, 50, 50);
    case "circle":
      return [];
  }
}

/** How many corner letters a figure has (a circle has one: its centre). */
export function vertexCount(shape: GeometryShape): number {
  return shape === "circle" ? 1 : shape === "triangle" ? 3 : 4;
}

/** How many sides can carry a label. */
export function sideCount(shape: GeometryShape): number {
  return shape === "circle" ? 0 : vertexCount(shape);
}

/** Which corner of a triangle preset is the right angle (-1 = none). */
export const RIGHT_ANGLE_CORNER = 2;

/** Rough size of a label in SVG units (good enough to keep it inside the drawing). */
export function textSize(text: string): { width: number; height: number } {
  return { width: Math.max(1, [...text].length) * GEOMETRY_FONT * 0.62, height: GEOMETRY_FONT * 1.15 };
}

const centroid = (points: Point[]): Point => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
});

const unit = (x: number, y: number): Point => {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
};

/**
 * Puts a label next to `from`, in direction `dir`: far enough that its
 * whole box stays clear of the point (or line) it belongs to.
 */
function place(text: string, from: Point, dir: Point, gap: number): PlacedLabel {
  const { width, height } = textSize(text);
  const distance = gap + (Math.abs(dir.x) * width) / 2 + (Math.abs(dir.y) * height) / 2;
  return { x: from.x + dir.x * distance, y: from.y + dir.y * distance, text, width, height };
}

/** Everything needed to draw a figure. */
export function geometryLayout(diagram: GeometryDiagram): GeometryLayout {
  const vertexLabels: PlacedLabel[] = [];
  const sideLabels: PlacedLabel[] = [];
  let points: Point[] = [];
  let circle: GeometryLayout["circle"] = null;
  let rightAngle: Point[] | null = null;
  let minX: number, minY: number, maxX: number, maxY: number;

  if (diagram.shape === "circle") {
    const center = { x: 0, y: 0 };
    const r = CIRCLE_RADIUS;
    // The radius goes up and to the right, so its label and the centre letter never meet.
    const dir = unit(Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6));
    const radiusEnd = diagram.radius ? { x: dir.x * r, y: dir.y * r } : null;
    circle = { center, r, radiusEnd, showCenter: diagram.showVertices || diagram.radius };
    if (diagram.showVertices && diagram.vertices[0]) vertexLabels.push(place(diagram.vertices[0], center, unit(-1, 1.4), 4));
    if (radiusEnd && diagram.radiusLabel) {
      const middle = { x: radiusEnd.x / 2, y: radiusEnd.y / 2 };
      sideLabels.push(place(diagram.radiusLabel, middle, { x: dir.y, y: -dir.x }, 3));
    }
    [minX, minY, maxX, maxY] = [-r, -r, r, r];
  } else {
    points = shapePoints(diagram.shape, diagram.triangle);
    const middle = centroid(points);
    points.forEach((point, i) => {
      const next = points[(i + 1) % points.length];
      if (diagram.showVertices && diagram.vertices[i]) {
        vertexLabels.push(place(diagram.vertices[i], point, unit(point.x - middle.x, point.y - middle.y), 4));
      }
      if (diagram.sides[i]) {
        const mid = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
        // The side's normal, pointing away from the middle of the figure.
        let normal = unit(-(next.y - point.y), next.x - point.x);
        if (normal.x * (mid.x - middle.x) + normal.y * (mid.y - middle.y) < 0) normal = { x: -normal.x, y: -normal.y };
        sideLabels.push(place(diagram.sides[i], mid, normal, 5));
      }
    });
    if (diagram.shape === "triangle" && diagram.triangle === "right" && diagram.rightAngle) {
      const corner = points[RIGHT_ANGLE_CORNER];
      const a = unit(points[0].x - corner.x, points[0].y - corner.y);
      const b = unit(points[1].x - corner.x, points[1].y - corner.y);
      rightAngle = [
        { x: corner.x + a.x * MARKER, y: corner.y + a.y * MARKER },
        { x: corner.x + (a.x + b.x) * MARKER, y: corner.y + (a.y + b.y) * MARKER },
        { x: corner.x + b.x * MARKER, y: corner.y + b.y * MARKER },
      ];
    }
    minX = Math.min(...points.map((p) => p.x));
    maxX = Math.max(...points.map((p) => p.x));
    minY = Math.min(...points.map((p) => p.y));
    maxY = Math.max(...points.map((p) => p.y));
  }

  // The drawing grows to hold every label, so nothing is ever cut off.
  for (const label of [...vertexLabels, ...sideLabels]) {
    minX = Math.min(minX, label.x - label.width / 2);
    maxX = Math.max(maxX, label.x + label.width / 2);
    minY = Math.min(minY, label.y - label.height / 2);
    maxY = Math.max(maxY, label.y + label.height / 2);
  }
  const viewBox = { x: minX - PADDING, y: minY - PADDING, width: maxX - minX + 2 * PADDING, height: maxY - minY + 2 * PADDING };
  return { viewBox, points, circle, rightAngle, vertexLabels, sideLabels };
}
