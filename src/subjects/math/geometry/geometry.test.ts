import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { normalizeTest } from "@/lib/storage/migrate";
import { DiagramView, diagramSize } from "@/subjects/physics/diagrams/DiagramView";
import { newCircuit, normalizeDiagram } from "@/subjects/physics/diagrams/normalize";
import type { GeometryDiagram } from "@/lib/storage/types";
import { CIRCLE_RADIUS, geometryLayout, shapePoints, sideCount, vertexCount, type Point } from "./geometry";
import { GEOMETRY_SHAPES, TRIANGLE_PRESETS, newGeometry, normalizeGeometry, withShape } from "./normalize";

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const sides = (points: Point[]) => points.map((p, i) => dist(p, points[(i + 1) % points.length]));
/** The angle at corner i, in degrees. */
function angle(points: Point[], i: number) {
  const p = points[i];
  const a = points[(i + points.length - 1) % points.length];
  const b = points[(i + 1) % points.length];
  const dot = (a.x - p.x) * (b.x - p.x) + (a.y - p.y) * (b.y - p.y);
  return (Math.acos(dot / (dist(a, p) * dist(b, p))) * 180) / Math.PI;
}
const cross = (a: Point, b: Point, c: Point, d: Point) => (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);

const everyFigure = (): GeometryDiagram[] => [
  ...TRIANGLE_PRESETS.map((preset) => newGeometry("triangle", preset)),
  ...GEOMETRY_SHAPES.filter((shape) => shape !== "triangle").map((shape) => newGeometry(shape)),
];

describe("geometric figures: shapes", () => {
  it("the triangle presets really are what they are called", () => {
    const general = sides(shapePoints("triangle", "general"));
    expect(Math.abs(general[0] - general[1])).toBeGreaterThan(15);
    expect(Math.abs(general[1] - general[2])).toBeGreaterThan(5);
    expect(Math.abs(general[0] - general[2])).toBeGreaterThan(15);
    for (let i = 0; i < 3; i++) expect(Math.abs(angle(shapePoints("triangle", "general"), i) - 90)).toBeGreaterThan(5);

    const right = shapePoints("triangle", "right");
    expect(angle(right, 2)).toBeCloseTo(90, 6);

    const [ab, bc, ca] = sides(shapePoints("triangle", "isosceles"));
    expect(ab).toBeCloseTo(bc, 6);
    expect(Math.abs(ab - ca)).toBeGreaterThan(10);

    const equal = sides(shapePoints("triangle", "equilateral"));
    expect(equal[0]).toBeCloseTo(equal[1], 6);
    expect(equal[1]).toBeCloseTo(equal[2], 6);
  });

  it("squares, rectangles, parallelograms and trapezoids keep their defining properties", () => {
    const square = shapePoints("square", "general");
    for (const side of sides(square)) expect(side).toBeCloseTo(sides(square)[0], 6);
    for (let i = 0; i < 4; i++) expect(angle(square, i)).toBeCloseTo(90, 6);

    const rectangle = shapePoints("rectangle", "general");
    for (let i = 0; i < 4; i++) expect(angle(rectangle, i)).toBeCloseTo(90, 6);
    expect(sides(rectangle)[1]).toBeGreaterThan(sides(rectangle)[0] * 1.3);

    const [a, b, c, d] = shapePoints("parallelogram", "general");
    expect(cross(a, b, d, c)).toBeCloseTo(0, 6);
    expect(cross(b, c, a, d)).toBeCloseTo(0, 6);
    expect(Math.abs(angle([a, b, c, d], 0) - 90)).toBeGreaterThan(10);

    const [p, q, r, s] = shapePoints("trapezoid", "general");
    expect(cross(q, r, p, s)).toBeCloseTo(0, 6); // the two bases are parallel
    expect(Math.abs(cross(p, q, s, r))).toBeGreaterThan(1); // the legs are not
    expect(dist(q, r)).toBeLessThan(dist(p, s));
  });

  it("a circle is round: the drawing is as wide as it is tall without labels", () => {
    const layout = geometryLayout({ ...newGeometry("circle"), showVertices: false, radius: false });
    expect(layout.viewBox.width).toBeCloseTo(layout.viewBox.height, 6);
    const withRadius = geometryLayout(newGeometry("circle"));
    expect(dist(withRadius.circle!.center, withRadius.circle!.radiusEnd!)).toBeCloseTo(CIRCLE_RADIUS, 6);
  });
});

describe("geometric figures: labels", () => {
  it("every label stays inside the drawing, even the longest ones", () => {
    for (const figure of everyFigure()) {
      const full = { ...figure, vertices: figure.vertices.map(() => "A12"), sides: figure.sides.map(() => "12,5 სმ = x?"), radiusLabel: "12,5 სმ = x?" };
      const { viewBox, vertexLabels, sideLabels } = geometryLayout(full);
      expect(vertexLabels).toHaveLength(vertexCount(figure.shape));
      expect(sideLabels).toHaveLength(figure.shape === "circle" ? 1 : sideCount(figure.shape));
      for (const label of [...vertexLabels, ...sideLabels]) {
        expect(label.x - label.width / 2).toBeGreaterThanOrEqual(viewBox.x);
        expect(label.x + label.width / 2).toBeLessThanOrEqual(viewBox.x + viewBox.width);
        expect(label.y - label.height / 2).toBeGreaterThanOrEqual(viewBox.y);
        expect(label.y + label.height / 2).toBeLessThanOrEqual(viewBox.y + viewBox.height);
      }
    }
  });

  it("labels don't sit on top of each other", () => {
    for (const figure of everyFigure()) {
      const full = { ...figure, sides: figure.sides.map(() => "12 სმ") };
      const { vertexLabels, sideLabels } = geometryLayout(full);
      const all = [...vertexLabels, ...sideLabels];
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const apartX = Math.abs(all[i].x - all[j].x) >= (all[i].width + all[j].width) / 2;
          const apartY = Math.abs(all[i].y - all[j].y) >= (all[i].height + all[j].height) / 2;
          expect(apartX || apartY, `${figure.shape}/${figure.triangle}: ${i} and ${j}`).toBe(true);
        }
      }
    }
  });

  it("hidden letters and empty labels are not drawn; the right-angle mark only on the right triangle", () => {
    const hidden = geometryLayout({ ...newGeometry("rectangle"), showVertices: false });
    expect(hidden.vertexLabels).toHaveLength(0);
    expect(hidden.sideLabels).toHaveLength(0);
    expect(geometryLayout(newGeometry("triangle", "right")).rightAngle).toHaveLength(3);
    expect(geometryLayout({ ...newGeometry("triangle", "right"), rightAngle: false }).rightAngle).toBeNull();
    expect(geometryLayout(newGeometry("triangle", "isosceles")).rightAngle).toBeNull();
    expect(geometryLayout(newGeometry("square")).rightAngle).toBeNull();
  });
});

describe("geometric figures: data", () => {
  it("a new figure is complete and survives normalizing unchanged", () => {
    for (const figure of everyFigure()) {
      expect(normalizeDiagram(structuredClone(figure))).toEqual(figure);
      const size = diagramSize(figure);
      expect(size.width).toBeGreaterThan(50);
      expect(size.height).toBeGreaterThan(50);
    }
  });

  it("repairs broken saved figures and drops unknown shapes", () => {
    expect(normalizeGeometry({ kind: "geometry", shape: "star" })).toBeNull();
    expect(normalizeGeometry({ kind: "geometry", shape: "square" })).toEqual(newGeometry("square"));
    const repaired = normalizeGeometry({
      shape: "triangle",
      triangle: "sharp",
      showVertices: "yes",
      vertices: ["KLMNOP", 7],
      sides: ["a very long label that never ends", null, "5 სმ", "extra"],
      radius: 1,
    })!;
    expect(repaired.triangle).toBe("general");
    expect(repaired.vertices).toEqual(["KLM", "B", "C"]);
    expect(repaired.sides).toEqual(["a very long ", "", "5 სმ"].map((s) => s.trimEnd()));
    expect(repaired.showVertices).toBe(true);
  });

  it("changing the shape keeps what the teacher typed where it still fits", () => {
    const triangle = { ...newGeometry("triangle"), vertices: ["K", "L", "M"], sides: ["5 სმ", "x", "?"] };
    const square = withShape(triangle, "square");
    expect(square.vertices).toEqual(["K", "L", "M", "D"]);
    expect(square.sides).toEqual(["5 სმ", "x", "?", ""]);
    const circle = withShape(square, "circle");
    expect(circle.vertices).toEqual(["O"]);
    expect(circle.sides).toEqual([]);
    expect(withShape(circle, "triangle", "right").vertices).toEqual(["A", "B", "C"]);
  });

  it("a saved test keeps its figure, next to the older kinds of diagram", () => {
    const image = (id: string, diagram: unknown) => ({ id, imageId: "", diagram, width: 200, height: 150 });
    const test = normalizeTest({
      id: "t",
      title: "x",
      questions: [
        {
          id: "q",
          type: "open-answer",
          images: [image("a", { kind: "geometry", shape: "circle", radiusLabel: "3 სმ" }), image("b", newCircuit()), image("c", { kind: "geometry", shape: "blob" })],
        },
      ],
    });
    const images = test!.questions[0].images;
    expect(images.map((i) => i.diagram?.kind)).toEqual(["geometry", "circuit"]);
    expect(images[0].diagram).toMatchObject({ shape: "circle", radius: true, radiusLabel: "3 სმ", vertices: ["O"] });
  });

  it("draws as SVG with its labels; old diagrams still draw", () => {
    const figure = { ...newGeometry("triangle", "right"), sides: ["5 სმ", "", "x"] };
    const svg = renderToStaticMarkup(createElement(DiagramView, { diagram: figure }));
    expect(svg).toContain("<polygon");
    expect(svg).toContain("data-right-angle");
    expect(svg).toContain("5 სმ");
    expect(renderToStaticMarkup(createElement(DiagramView, { diagram: newGeometry("circle") }))).toContain("<circle");
    expect(renderToStaticMarkup(createElement(DiagramView, { diagram: newCircuit() }))).toContain("<svg");
  });
});
