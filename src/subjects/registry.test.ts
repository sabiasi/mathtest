import { describe, expect, it } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { QUESTION_TYPES } from "@/lib/questions";
import { SUBJECT_IDS, subjectFromText } from "./ids";
import { SUBJECTS, getToolkit } from "./registry";

describe("subject toolkits", () => {
  it("has one toolkit per subject id, in picker order", () => {
    expect(SUBJECTS.map((s) => s.id)).toEqual([...SUBJECT_IDS]);
    for (const id of SUBJECT_IDS) expect(getToolkit(id).id).toBe(id);
  });

  it("every subject offers all the common question types", () => {
    for (const toolkit of SUBJECTS) {
      for (const type of QUESTION_TYPES) expect(toolkit.questionTypes).toContain(type);
    }
  });

  it("every subject has a name in both languages and its own print class", () => {
    for (const id of SUBJECT_IDS) {
      expect(dictionaries.ka[`subject.${id}`]).toBeTruthy();
      expect(dictionaries.en[`subject.${id}`]).toBeTruthy();
      expect(getToolkit(id).print.className).toBe(`subject-${id}`);
    }
  });

  it("math keeps the full formula toolbar", () => {
    expect(getToolkit("math").toolbar.map((tab) => tab.id)).toEqual(["basic", "algebra", "trig", "calculus", "geometry", "sets", "greek"]);
  });

  it("physics has every math tab plus its own, and its special tools", () => {
    const physics = getToolkit("physics");
    const ids = physics.toolbar.map((tab) => tab.id);
    for (const tab of getToolkit("math").toolbar) expect(ids).toContain(tab.id);
    for (const id of ["units", "vectors", "constants", "formulas"]) expect(ids).toContain(id);
    expect(physics.questionTypes).toContain("given-find");
    expect(physics.diagrams).toEqual(["circuit", "forces"]);
    expect(getToolkit("math").questionTypes).not.toContain("given-find");
  });

  it("units come in Latin and Georgian letters, with the same buttons", () => {
    const units = getToolkit("physics").toolbar.find((tab) => tab.id === "units")!;
    const [latin, georgian] = units.styles!.options;
    expect(latin.buttons.length).toBe(georgian.buttons.length);
    expect(latin.buttons.some((b) => b.latex === "\\,\\mathrm{N}")).toBe(true);
    expect(georgian.buttons.some((b) => b.latex === "\\,\\text{ნ}")).toBe(true);
  });

  it("no two buttons in a tab are the same (they'd confuse teachers)", () => {
    for (const toolkit of SUBJECTS) {
      for (const tab of toolkit.toolbar) {
        for (const buttons of [tab.buttons, ...(tab.styles?.options.map((o) => o.buttons) ?? [])]) {
          const keys = buttons.map((b) => b.latex + b.display);
          expect(new Set(keys).size).toBe(keys.length);
        }
      }
    }
  });

  it("subjects without formulas have no formula toolbar", () => {
    for (const toolkit of SUBJECTS) if (!toolkit.formulas) expect(toolkit.toolbar).toEqual([]);
  });
});

describe("subjectFromText", () => {
  it("recognises names in Georgian and English, ignoring case and spaces", () => {
    expect(subjectFromText("მათემატიკა")).toBe("math");
    expect(subjectFromText("  PHYSICS ")).toBe("physics");
    expect(subjectFromText("ქართული ენა და ლიტერატურა")).toBe("georgian");
    expect(subjectFromText("history")).toBe("history");
  });
  it("returns null for anything else", () => {
    expect(subjectFromText("")).toBeNull();
    expect(subjectFromText("მუსიკა")).toBeNull();
  });
});
