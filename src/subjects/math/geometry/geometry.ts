/**
 * Geometric figures: where the corners are, where the letters and side
 * labels go, and how big the drawing is. Pure maths, no React — the editor
 * preview, the paper and the PDF all draw from `geometryLayout`.
 *
 * Units are SVG units (y grows downward). Corners go clockwise starting at
 * the bottom left: triangle A (left), B (top), C (right); four-sided figures
 * A (bottom left), B (top left), C (top right), D (bottom right); regular
 * pentagon / hexagon the same way round, A at the bottom left.
 *
 * Extras (inscribed / circumscribed circle, diagonals, height, diameter) are
 * drawn only where they exist for that shape: `geometryExtras` says which.
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

export interface Segment {
  from: Point;
  to: Point;
  dashed: boolean;
}

export interface GeometryLayout {
  viewBox: { x: number; y: number; width: number; height: number };
  /** Corners of a straight-sided figure ([] for a circle). */
  points: Point[];
  circle: { center: Point; r: number; radiusEnd: Point | null; showCenter: boolean } | null;
  /** The three corners of the small right-angle square (drawn as two lines), or null. */
  rightAngle: Point[] | null;
  /** More right-angle marks (the foot of a height, a right trapezoid's corners). */
  marks: Point[][];
  /** Inscribed / circumscribed circles. */
  circles: { center: Point; r: number; kind: "inscribed" | "circumscribed" }[];
  /** The dot at the centre of those circles, or null. */
  centerDot: Point | null;
  /** Diagonals, the height, the diameter… */
  segments: Segment[];
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
  // The angle at B (the top) is greater than 90°.
  obtuse: [
    { x: 0, y: 75 },
    { x: 65, y: 0 },
    { x: 230, y: 75 },
  ],
};

/** Rhombus with sides 125: the top is moved 60 to the right. */
const RHOMBUS_HEIGHT = Math.sqrt(125 * 125 - 60 * 60);
/**
 * A trapezoid that has an inscribed circle (bases 200 and 80, legs 140 = half
 * their sum; height √(200·80)). It is isosceles, so it has a circumscribed one too.
 */
const TANGENTIAL_TRAPEZOID_HEIGHT = Math.sqrt(200 * 80);

/** A regular polygon with a flat bottom side, corner 0 at the bottom left, clockwise. */
function regular(n: number, r: number): Point[] {
  return Array.from({ length: n }, (_, k) => {
    const angle = Math.PI / 2 + Math.PI / n + (2 * Math.PI * k) / n;
    return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
  });
}

const box = (width: number, height: number, slantLeft = 0, slantRight = 0): Point[] => [
  { x: 0, y: height },
  { x: slantLeft, y: 0 },
  { x: width - slantRight, y: 0 },
  { x: width, y: height },
];

/**
 * The corners of a straight-sided figure ([] for a circle). `inscribed`: a
 * trapezoid then takes a shape that really has a circle inside it.
 */
export function shapePoints(shape: GeometryShape, triangle: TrianglePreset, inscribed = false): Point[] {
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
      return inscribed ? box(200, TANGENTIAL_TRAPEZOID_HEIGHT, 60, 60) : box(210, 110, 50, 50);
    case "rhombus":
      return [
        { x: 0, y: RHOMBUS_HEIGHT },
        { x: 60, y: 0 },
        { x: 185, y: 0 },
        { x: 125, y: RHOMBUS_HEIGHT },
      ];
    case "right-trapezoid":
      // Right angles at A and B (the left side is the height).
      return box(210, 115, 0, 80);
    case "pentagon":
      return regular(5, 80);
    case "hexagon":
      return regular(6, 78);
    case "circle":
      return [];
  }
}

/** How many corner letters a figure has (a circle has one: its centre). */
export function vertexCount(shape: GeometryShape): number {
  switch (shape) {
    case "circle":
      return 1;
    case "triangle":
      return 3;
    case "pentagon":
      return 5;
    case "hexagon":
      return 6;
    default:
      return 4;
  }
}

/** Which extras a figure can have (the editor offers only these; others are never drawn). */
export function geometryExtras(shape: GeometryShape) {
  // Only figures that really have such a circle (as drawn here).
  const inscribed = ["triangle", "square", "rhombus", "trapezoid", "pentagon", "hexagon"].includes(shape);
  const circumscribed = ["triangle", "square", "rectangle", "trapezoid", "pentagon", "hexagon"].includes(shape);
  return {
    inscribed,
    circumscribed,
    diagonals: vertexCount(shape) >= 4 && shape !== "circle",
    height: ["triangle", "parallelogram", "trapezoid", "rhombus"].includes(shape),
    diameter: shape === "circle",
  };
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

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** The foot of the perpendicular from `p` to the line through `a` and `b`. */
function foot(p: Point, a: Point, b: Point): Point {
  const d = { x: b.x - a.x, y: b.y - a.y };
  const t = ((p.x - a.x) * d.x + (p.y - a.y) * d.y) / (d.x * d.x + d.y * d.y || 1);
  return { x: a.x + d.x * t, y: a.y + d.y * t };
}

/** The circle through three points (a figure whose corners all lie on one circle). */
function circumcircle([a, b, c]: Point[]): { center: Point; r: number } {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  const sq = (p: Point) => p.x * p.x + p.y * p.y;
  const center = {
    x: (sq(a) * (b.y - c.y) + sq(b) * (c.y - a.y) + sq(c) * (a.y - b.y)) / d,
    y: (sq(a) * (c.x - b.x) + sq(b) * (a.x - c.x) + sq(c) * (b.x - a.x)) / d,
  };
  return { center, r: distance(center, a) };
}

/** The circle inside a triangle, or inside a symmetric figure (centre = middle of its corners). */
function incircle(points: Point[]): { center: Point; r: number } {
  if (points.length === 3) {
    const [a, b, c] = points;
    const [la, lb, lc] = [distance(b, c), distance(c, a), distance(a, b)];
    const sum = la + lb + lc;
    const center = { x: (la * a.x + lb * b.x + lc * c.x) / sum, y: (la * a.y + lb * b.y + lc * c.y) / sum };
    return { center, r: distance(center, foot(center, a, b)) };
  }
  const center = centroid(points);
  // A tangential trapezoid: the centre is half-way up (its corners' middle is lower).
  const ys = points.map((p) => p.y);
  if (points.length === 4 && points[1].y === points[2].y && points[0].y === points[3].y) center.y = (Math.min(...ys) + Math.max(...ys)) / 2;
  return { center, r: distance(center, foot(center, points[0], points[1])) };
}

/** The small right-angle square at `corner`, between the directions to `a` and `b`. */
function rightMark(corner: Point, a: Point, b: Point): Point[] {
  const u = unit(a.x - corner.x, a.y - corner.y);
  const v = unit(b.x - corner.x, b.y - corner.y);
  return [
    { x: corner.x + u.x * MARKER, y: corner.y + u.y * MARKER },
    { x: corner.x + (u.x + v.x) * MARKER, y: corner.y + (u.y + v.y) * MARKER },
    { x: corner.x + v.x * MARKER, y: corner.y + v.y * MARKER },
  ];
}

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
  const marks: Point[][] = [];
  const circles: GeometryLayout["circles"] = [];
  const segments: Segment[] = [];
  let centerDot: Point | null = null;
  const extras = geometryExtras(diagram.shape);
  let minX: number, minY: number, maxX: number, maxY: number;

  if (diagram.shape === "circle") {
    const center = { x: 0, y: 0 };
    const r = CIRCLE_RADIUS;
    // The radius goes up and to the right, so its label and the centre letter never meet.
    const dir = unit(Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6));
    const radiusEnd = diagram.radius ? { x: dir.x * r, y: dir.y * r } : null;
    circle = { center, r, radiusEnd, showCenter: diagram.showVertices || diagram.radius || diagram.diameter };
    if (diagram.diameter) segments.push({ from: { x: -r, y: 0 }, to: { x: r, y: 0 }, dashed: false });
    if (diagram.showVertices && diagram.vertices[0]) vertexLabels.push(place(diagram.vertices[0], center, unit(-1, 1.4), 4));
    if (radiusEnd && diagram.radiusLabel) {
      const middle = { x: radiusEnd.x / 2, y: radiusEnd.y / 2 };
      sideLabels.push(place(diagram.radiusLabel, middle, { x: dir.y, y: -dir.x }, 3));
    }
    [minX, minY, maxX, maxY] = [-r, -r, r, r];
  } else {
    points = shapePoints(diagram.shape, diagram.triangle, diagram.inscribed && extras.inscribed);
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
      rightAngle = rightMark(points[RIGHT_ANGLE_CORNER], points[0], points[1]);
    }
    if (diagram.shape === "right-trapezoid" && diagram.rightAngle) {
      marks.push(rightMark(points[0], points[3], points[1]), rightMark(points[1], points[0], points[2]));
    }

    // ---- Extras ----
    if (diagram.diagonals && extras.diagonals) {
      for (let i = 0; i < points.length; i++)
        for (let j = i + 2; j < points.length; j++) if (!(i === 0 && j === points.length - 1)) segments.push({ from: points[i], to: points[j], dashed: false });
    }
    if (diagram.height && extras.height) {
      // Triangles: from B to AC (the right triangle: from the right angle to the long side).
      // Four-sided figures: from B straight down to AD.
      const [top, a, b] =
        diagram.shape === "triangle" ? (diagram.triangle === "right" ? [points[2], points[0], points[1]] : [points[1], points[0], points[2]]) : [points[1], points[0], points[3]];
      const end = foot(top, a, b);
      segments.push({ from: top, to: end, dashed: true });
      // A foot outside the base: the base is extended with a dashed line.
      const along = (p: Point) => (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
      const length = along(b);
      if (along(end) < 0) segments.push({ from: a, to: end, dashed: true });
      if (along(end) > length) segments.push({ from: b, to: end, dashed: true });
      marks.push(rightMark(end, top, along(end) > length / 2 ? a : b));
      if (diagram.heightLabel) {
        // A third of the way down: clear of a circle's centre letter (lower in the figure).
        const mid = { x: top.x + (end.x - top.x) * 0.35, y: top.y + (end.y - top.y) * 0.35 };
        const dir = unit(-(end.y - top.y), end.x - top.x);
        // On the side of the height that has more room (towards the figure's middle).
        const side = dir.x * (middle.x - mid.x) + dir.y * (middle.y - mid.y) >= 0 ? dir : { x: -dir.x, y: -dir.y };
        sideLabels.push(place(diagram.heightLabel, mid, side, 3));
      }
    }
    const circleOf = (kind: "inscribed" | "circumscribed") => (kind === "inscribed" ? incircle(points) : circumcircle(points));
    for (const kind of ["inscribed", "circumscribed"] as const) {
      if (!diagram[kind] || !extras[kind]) continue;
      const { center, r } = circleOf(kind);
      circles.push({ center, r, kind });
      centerDot = center;
    }
    if (centerDot && diagram.showVertices && diagram.centerLetter) vertexLabels.push(place(diagram.centerLetter, centerDot, unit(-1, 1.4), 3));

    const all = [...points, ...segments.flatMap((s) => [s.from, s.to])];
    minX = Math.min(...all.map((p) => p.x));
    maxX = Math.max(...all.map((p) => p.x));
    minY = Math.min(...all.map((p) => p.y));
    maxY = Math.max(...all.map((p) => p.y));
    for (const { center, r } of circles) {
      minX = Math.min(minX, center.x - r);
      maxX = Math.max(maxX, center.x + r);
      minY = Math.min(minY, center.y - r);
      maxY = Math.max(maxY, center.y + r);
    }
  }

  // The drawing grows to hold every label, so nothing is ever cut off.
  for (const label of [...vertexLabels, ...sideLabels]) {
    minX = Math.min(minX, label.x - label.width / 2);
    maxX = Math.max(maxX, label.x + label.width / 2);
    minY = Math.min(minY, label.y - label.height / 2);
    maxY = Math.max(maxY, label.y + label.height / 2);
  }
  const viewBox = { x: minX - PADDING, y: minY - PADDING, width: maxX - minX + 2 * PADDING, height: maxY - minY + 2 * PADDING };
  return { viewBox, points, circle, rightAngle, marks, circles, centerDot, segments, vertexLabels, sideLabels };
}
