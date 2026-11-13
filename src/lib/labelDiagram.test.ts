import { describe, expect, it } from "vitest";
import type { DiagramLabel, LabelDiagramQuestion } from "@/lib/storage/types";
import { BIO_DRAWINGS } from "@/subjects/biology/drawings";
import {
  LABEL_COLUMNS,
  PICTURE_BOX,
  areaAspect,
  bankWords,
  labelGap,
  labelLetters,
  labelsForParts,
  linesCross,
  numberTopToBottom,
  placeLabel,
  printedBank,
  spreadAlongSide,
  toArea,
} from "./labelDiagram";
import { createQuestion } from "./questions";
import { arrangeItems, seededRandom } from "./variants";

const label = (id: string, answer: string, ly = 50, lx = LABEL_COLUMNS.left): DiagramLabel => ({ id, x: 40, y: ly, lx, ly, answer });

function question(changes: Partial<LabelDiagramQuestion>): LabelDiagramQuestion {
  return { ...(createQuestion("label-diagram") as LabelDiagramQuestion), ...changes };
}

describe("drawing area", () => {
  it("puts the picture in the middle, with room at the sides", () => {
    expect(PICTURE_BOX.left).toBeGreaterThan(15);
    expect(PICTURE_BOX.left * 2 + PICTURE_BOX.width).toBeCloseTo(100);
    expect(toArea(0, 0, 400, 300)).toEqual({ x: Math.round(PICTURE_BOX.left * 10) / 10, y: Math.round(PICTURE_BOX.top * 10) / 10 });
    expect(toArea(200, 150, 400, 300)).toEqual({ x: 50, y: 50 });
  });
});

describe("placeLabel", () => {
  const aspect = areaAspect(480, 340);
  it("puts a label in the margin on the nearer side, level with the point", () => {
    expect(placeLabel([], 30, 40, aspect)).toEqual({ lx: LABEL_COLUMNS.left, ly: 40 });
    expect(placeLabel([], 70, 40, aspect)).toEqual({ lx: LABEL_COLUMNS.right, ly: 40 });
  });
  it("moves it up or down so boxes on the same side don't touch", () => {
    const placed = placeLabel([{ lx: LABEL_COLUMNS.left, ly: 40 }], 30, 41, aspect);
    expect(placed.lx).toBe(LABEL_COLUMNS.left);
    expect(Math.abs(placed.ly - 40)).toBeGreaterThanOrEqual(labelGap(aspect));
  });
  it("uses the other side when one side is full", () => {
    const full = Array.from({ length: 12 }, (_, i) => ({ lx: LABEL_COLUMNS.left, ly: 3 + i * 8.5 }));
    expect(placeLabel(full, 20, 50, aspect).lx).toBe(LABEL_COLUMNS.right);
  });
});

describe("built-in drawings", () => {
  it("every part lies on its drawing, and parts can become labels without overlapping", () => {
    for (const drawing of BIO_DRAWINGS) {
      expect(drawing.svg.startsWith("<svg")).toBe(true);
      expect(drawing.parts.length).toBeGreaterThanOrEqual(4);
      for (const part of drawing.parts) {
        expect(part.x).toBeGreaterThanOrEqual(0);
        expect(part.x).toBeLessThanOrEqual(drawing.width);
        expect(part.y).toBeGreaterThanOrEqual(0);
        expect(part.y).toBeLessThanOrEqual(drawing.height);
      }
      const names = drawing.parts.map((p) => ({ x: p.x, y: p.y, name: p.ka }));
      let n = 0;
      const labels = labelsForParts([], names, drawing.width, drawing.height, () => String(n++));
      expect(labels.map((l) => l.answer).sort()).toEqual(drawing.parts.map((p) => p.ka).sort());
      // Adding them again changes nothing (names already there are skipped).
      expect(labelsForParts(labels, names, drawing.width, drawing.height, () => "x")).toHaveLength(labels.length);
    }
  });
});

describe("word box and letters", () => {
  it("lists every name once (the answers, then the extra words)", () => {
    expect(bankWords({ labels: [label("a", "ბირთვი"), label("b", " ბირთვი "), label("c", "")], extras: ["ვაკუოლი", "ბირთვი"] })).toEqual(["ბირთვი", "ვაკუოლი"]);
  });

  it("is alphabetical for boxes / numbers, and shuffled per variant for matching — with letters that follow the printed order", () => {
    const q = question({ mode: "match", labels: [label("a", "ბირთვი"), label("b", "აქსონი"), label("c", "ვაკუოლი")], extras: ["გარსი"] });
    expect(printedBank({ ...q, mode: "numbers" })).toEqual(["აქსონი", "ბირთვი", "გარსი", "ვაკუოლი"]);
    for (let seed = 1; seed < 6; seed++) {
      const copy = arrangeItems(q, seededRandom(seed)) as LabelDiagramQuestion;
      const bank = printedBank(copy);
      expect([...bank].sort()).toEqual([...bankWords(q)].sort());
      // Each label's letter points at its own name in this copy's box.
      labelLetters(copy, "georgian").forEach((letter, i) => {
        expect(bank["აბგდევზთიკლმნოპრ".indexOf(letter)]).toBe(q.labels[i].answer);
      });
      // The labels themselves never move.
      expect(copy.labels).toEqual(q.labels);
    }
  });
});

describe("numberTopToBottom", () => {
  it("orders labels by height", () => {
    expect(numberTopToBottom([label("a", "", 60), label("b", "", 20), label("c", "", 40)]).map((l) => l.id)).toEqual(["b", "c", "a"]);
  });
});

describe("spreadAlongSide", () => {
  it("keeps the order, keeps labels apart, and stays inside the area", () => {
    expect(spreadAlongSide([10, 12, 14], 8)).toEqual([10, 18, 26]);
    expect(spreadAlongSide([90, 95, 96], 8)).toEqual([81, 89, 97]);
    const ys = spreadAlongSide([5, 6, 7, 8, 9, 50, 51], 10);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(10);
  });

  it("built-in drawings: no two lines cross when all parts are added", () => {
    for (const drawing of BIO_DRAWINGS) {
      let n = 0;
      const labels = labelsForParts([], drawing.parts.map((p) => ({ x: p.x, y: p.y, name: p.ka })), drawing.width, drawing.height, () => String(n++));
      const aspect = areaAspect(drawing.width, drawing.height);
      const at = (x: number, y: number): [number, number] => [x * aspect, y];
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          const [a, b] = [labels[i], labels[j]];
          expect(linesCross(at(a.lx, a.ly), at(a.x, a.y), at(b.lx, b.ly), at(b.x, b.y)), `${drawing.id}: ${a.answer} × ${b.answer}`).toBe(false);
        }
      }
    }
  });

  it("linesCross", () => {
    expect(linesCross([0, 0], [10, 10], [0, 10], [10, 0])).toBe(true);
    expect(linesCross([0, 0], [10, 0], [0, 5], [10, 5])).toBe(false);
  });
});
