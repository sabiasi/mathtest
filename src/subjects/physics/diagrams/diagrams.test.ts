import { describe, expect, it } from "vitest";
import type { CircuitDiagram, ForceDiagram } from "@/lib/storage/types";
import { allEdges, circuitViewBox, edgeEnds, forceLayout, junctions, labelParts, presetAngle, reorientForces } from "./geometry";
import { fitCircuit, newCircuit, normalizeDiagram, parseEdge } from "./normalize";

describe("labels", () => {
  it("writes numbers after letters, and text after _, small and low", () => {
    expect(labelParts("R1")).toEqual({ main: "R", sub: "1" });
    expect(labelParts("F_ხ")).toEqual({ main: "F", sub: "ხ" });
    expect(labelParts("mg")).toEqual({ main: "mg", sub: "" });
    expect(labelParts("6 Ω")).toEqual({ main: "6 Ω", sub: "" });
  });
});

describe("circuit grid", () => {
  it("knows every gap of the grid and where it is", () => {
    // 2×1 squares: 3 horizontal gaps per row × 2 rows... = 2*2 horizontal + 3 vertical
    expect(allEdges(2, 1)).toHaveLength(7);
    expect(parseEdge("h:1:1", 2, 1)).toEqual({ dir: "h", x: 1, y: 1 });
    expect(parseEdge("h:2:0", 2, 1)).toBeNull(); // would leave the grid
    expect(parseEdge("v:2:0", 2, 1)).toEqual({ dir: "v", x: 2, y: 0 });
    expect(parseEdge("x:0:0", 2, 1)).toBeNull();
    const [a, b] = edgeEnds("v:0:0", 2, 1)!;
    expect(b.y - a.y).toBe(70);
  });

  it("marks dots where three wires meet", () => {
    const tee: CircuitDiagram = {
      kind: "circuit",
      cols: 2,
      rows: 1,
      elements: ["h:0:0", "h:1:0", "v:1:0"].map((at) => ({ at, part: "wire", label: "", flipped: false })),
    };
    expect(junctions(tee)).toHaveLength(1);
    expect(junctions(newCircuit())).toHaveLength(0); // a simple loop has no junctions
  });

  it("on paper, shows only the part of the grid that is used", () => {
    const small: CircuitDiagram = { kind: "circuit", cols: 6, rows: 4, elements: [{ at: "h:0:0", part: "resistor", label: "", flipped: false }] };
    const paper = circuitViewBox(small, false);
    const editor = circuitViewBox(small, true);
    expect(paper.width).toBeLessThan(editor.width);
    expect(paper.height).toBeLessThan(editor.height);
  });

  it("making the grid smaller drops parts that no longer fit", () => {
    expect(fitCircuit(newCircuit(), 2, 2).elements.some((e) => e.at === "v:3:0")).toBe(false);
  });
});

describe("force diagrams", () => {
  const base: ForceDiagram = { kind: "forces", body: "box", surface: "incline", inclineAngle: 30, vectorLabels: true, forces: [] };

  it("points the quick forces the right way on an incline", () => {
    expect(presetAngle("gravity", base)).toBe(270);
    expect(presetAngle("normal", base)).toBe(120); // at right angles to a 30° slope
    expect(presetAngle("friction", base)).toBe(30); // up the slope
    expect(presetAngle("normal", { ...base, surface: "floor" })).toBe(90);
    expect(presetAngle("friction", { ...base, surface: "floor" })).toBe(180);
  });

  it("turns N and friction with the surface, but not forces the teacher aimed", () => {
    const floor: ForceDiagram = {
      ...base,
      surface: "floor",
      forces: [
        { id: "g", angle: 270, length: 2, label: "mg" },
        { id: "n", angle: 90, length: 2, label: "N" },
        { id: "f", angle: 180, length: 2, label: "F_ხ" },
        { id: "own", angle: 200, length: 2, label: "F" },
      ],
    };
    const onIncline = reorientForces(floor, { ...floor, surface: "incline", inclineAngle: 30 });
    expect(onIncline.forces.map((f) => f.angle)).toEqual([270, 120, 30, 200]);
    const steeper = reorientForces(onIncline, { ...onIncline, inclineAngle: 45 });
    expect(steeper.forces.map((f) => f.angle)).toEqual([270, 135, 45, 200]);
  });

  it("draws arrows from the centre and fits the picture around them", () => {
    const layout = forceLayout({ ...base, surface: "none", forces: [{ id: "a", angle: 270, length: 3, label: "mg" }] });
    expect(layout.arrows[0].tip).toEqual({ x: 0, y: 95 }); // down on screen
    const box = layout.viewBox;
    expect(box.y + box.height).toBeGreaterThan(95 + 16);
  });

  it("tilts the body and draws the incline at the given angle", () => {
    const layout = forceLayout(base);
    expect(layout.bodyRotation).toBe(-30);
    const [bottom, top, corner] = layout.incline!;
    const slope = Math.atan2(bottom.y - top.y, top.x - bottom.x) * (180 / Math.PI);
    expect(Math.round(slope)).toBe(30);
    expect(corner.x).toBe(top.x);
  });
});

describe("normalizeDiagram", () => {
  it("repairs and limits saved diagrams", () => {
    const circuit = normalizeDiagram({
      kind: "circuit",
      cols: 99,
      rows: 2,
      elements: [
        { at: "h:0:0", part: "battery", label: "a-very-long-label-indeed" },
        { at: "h:0:0", part: "lamp" }, // the same gap twice
        { at: "h:0:9", part: "lamp" }, // outside the grid
        { at: "h:1:0", part: "rocket" }, // unknown part
      ],
    });
    expect(circuit).toMatchObject({ cols: 8, elements: [{ at: "h:0:0", part: "battery", label: "a-very-long-", flipped: false }] });
    expect(normalizeDiagram({ kind: "forces", inclineAngle: 80, forces: [{ id: "f", angle: -90, length: 7 }] })).toMatchObject({
      surface: "floor",
      inclineAngle: 60,
      forces: [{ angle: 270, length: 3, label: "" }],
    });
    expect(normalizeDiagram({ kind: "spaceship" })).toBeNull();
  });
});
