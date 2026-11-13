import { describe, expect, it } from "vitest";
import { findProblems } from "@/lib/checks";
import { createQuestion } from "@/lib/questions";
import type { BalanceQuestion, Test } from "@/lib/storage/types";
import { getToolkit } from "../registry";
import { ELEMENTS } from "./elements";
import { STRUCTURE_TEMPLATES, fitStructure, normalizeStructure } from "./structure/normalize";

describe("periodic table data", () => {
  it("has 118 elements, each once, each in its own cell", () => {
    expect(ELEMENTS).toHaveLength(118);
    expect(new Set(ELEMENTS.map((e) => e.number)).size).toBe(118);
    expect(new Set(ELEMENTS.map((e) => e.symbol)).size).toBe(118);
    expect(new Set(ELEMENTS.map((e) => `${e.row}:${e.column}`)).size).toBe(118);
    expect(ELEMENTS.every((e) => e.column >= 1 && e.column <= 18 && e.ka && e.en)).toBe(true);
    expect(ELEMENTS.find((e) => e.symbol === "Fe")).toMatchObject({ number: 26, ka: "რკინა", row: 4, column: 8 });
  });
});

describe("structural formulas", () => {
  it("every ready-made molecule is valid data", () => {
    for (const template of STRUCTURE_TEMPLATES) {
      const molecule = template.make();
      expect(normalizeStructure(molecule as unknown as Record<string, unknown>)).toEqual(molecule);
    }
  });

  it("ethene has a double bond and ethyne a triple one", () => {
    const ethene = STRUCTURE_TEMPLATES.find((t) => t.id === "ethene")!.make();
    const ethyne = STRUCTURE_TEMPLATES.find((t) => t.id === "ethyne")!.make();
    expect(ethene.bonds.some((b) => b.order === 2)).toBe(true);
    expect(ethyne.bonds.some((b) => b.order === 3)).toBe(true);
  });

  it("repairs saved data and shrinks with the grid", () => {
    const repaired = normalizeStructure({
      kind: "structure",
      cols: 2,
      rows: 1,
      atoms: [{ at: "0:0", label: "C" }, { at: "0:0", label: "H" }, { at: "9:9", label: "O" }, { at: "1:0", label: "  " }],
      bonds: [{ at: "h:0:0", order: 5 }, { at: "v:7:0", order: 1 }],
    });
    expect(repaired.atoms).toEqual([{ at: "0:0", label: "C" }]);
    expect(repaired.bonds).toEqual([{ at: "h:0:0", order: 3 }]);
    const ethanol = STRUCTURE_TEMPLATES.find((t) => t.id === "ethanol")!.make();
    expect(fitStructure(ethanol, 2, 2).atoms.every((a) => Number(a.at.split(":")[0]) <= 2)).toBe(true);
  });
});

describe("chemistry toolkit", () => {
  it("has the chemistry button, balance questions and structural formulas", () => {
    const chemistry = getToolkit("chemistry");
    expect(chemistry.chemistry).toBe(true);
    expect(chemistry.questionTypes).toContain("balance");
    expect(chemistry.diagrams).toEqual(["structure"]);
    expect(chemistry.toolbar.map((tab) => tab.id).slice(0, 3)).toEqual(["formulas", "reactions", "redox"]);
    // Chemistry buttons type mhchem code into the formula.
    expect(chemistry.toolbar[0].buttons.find((b) => b.chem === "(aq)")).toBeDefined();
  });

  it("warns when the 'balanced' equation of a question isn't", () => {
    const question = { ...createQuestion("balance"), text: [{ type: "text" as const, text: "?" }] } as BalanceQuestion;
    const test = (balanced: string) => ({ questions: [{ ...question, equations: [{ id: "e", balanced }] }] }) as unknown as Test;
    expect(findProblems(test("2H2 + O2 -> 2H2O"))).toEqual([]);
    expect(findProblems(test("H2 + O2 -> H2O")).map((p) => p.kind)).toEqual(["unbalanced"]);
  });
});
