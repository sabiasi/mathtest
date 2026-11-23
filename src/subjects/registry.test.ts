import { describe, expect, it } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { QUESTION_TYPES } from "@/lib/questions";
import { SUBJECT_IDS, subjectFromText } from "./ids";
import { SUBJECTS, getToolkit } from "./registry";
import { buttonKey } from "./types";

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
    expect(getToolkit("math").toolbar.map((tab) => tab.id)).toEqual(["basic", "algebra", "brackets", "trig", "calculus", "matrices", "geometry", "sets", "greek", "arrows"]);
  });

  it("physics shows its own tabs and the math it uses most; the search reaches the other math tabs", () => {
    const physics = getToolkit("physics");
    const ids = physics.toolbar.map((tab) => tab.id);
    for (const id of ["basic", "algebra", "trig", "calculus", "geometry", "greek"]) expect(ids).toContain(id);
    const reachable = [...ids, ...(physics.searchExtra ?? []).map((tab) => tab.id)];
    for (const tab of getToolkit("math").toolbar) expect(reachable).toContain(tab.id);
    for (const id of ["units", "vectors", "constants", "formulas"]) expect(ids).toContain(id);
    expect(physics.questionTypes).toContain("given-find");
    expect(physics.diagrams).toEqual(["circuit", "forces"]);
    expect(getToolkit("math").diagrams).toEqual(["geometry"]);
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
          const keys = buttons.map((b) => buttonKey(b) + b.display);
          expect(new Set(keys).size).toBe(keys.length);
        }
      }
    }
  });

  it("subjects without formulas only have text buttons (no formula buttons)", () => {
    for (const toolkit of SUBJECTS) {
      if (toolkit.formulas) continue;
      for (const tab of toolkit.toolbar) {
        for (const buttons of [tab.buttons, ...(tab.styles?.options.map((o) => o.buttons) ?? [])]) {
          for (const button of buttons) expect(button.text !== undefined || button.format !== undefined).toBe(true);
        }
      }
    }
  });

  it("English: sections, listening, puzzles, English paper", () => {
    const english = getToolkit("english");
    for (const type of ["section", "passage", "listening", "fill-blank", "transformation", "word-formation", "crossword", "word-search", "speaking"]) {
      expect(english.questionTypes).toContain(type);
    }
    expect(english.print.language).toBe("en");
    expect(english.levels).toBe(true);
    expect(english.labelStyle).toBe("latin");
    // Every instruction template has both languages (the Georgian one explains it in the menu).
    for (const template of english.instructionTemplates ?? []) expect(template.en && template.ka).toBeTruthy();
    // A preset prepares a question of an existing type.
    const verbForms = english.presets?.find((p) => p.id === "verb-forms");
    expect(verbForms?.type).toBe("fill-blank");
  });

  it("Georgian offers texts, grammar and essays, matching templates and Georgian typography", () => {
    const georgian = getToolkit("georgian");
    for (const type of ["passage", "poem", "fill-blank", "mark-words", "grammar-table", "find-mistake", "sentence-analysis", "essay"]) {
      expect(georgian.questionTypes).toContain(type);
    }
    expect(georgian.matchingTemplates?.map((t) => t.id)).toEqual(expect.arrayContaining(["author-work", "work-character", "author-character"]));
    expect(georgian.print.typography).toBe("georgian");
    expect(getToolkit("math").print.typography).toBeUndefined();
    // Fill in the blanks is common to every subject.
    expect(getToolkit("physics").questionTypes).toContain("fill-blank");
  });

  it("history offers its own question types, matching templates and date tools", () => {
    const history = getToolkit("history");
    for (const type of ["matching", "order", "timeline", "source", "map"]) expect(history.questionTypes).toContain(type);
    expect(history.matchingTemplates?.length).toBeGreaterThan(0);
    const dates = history.toolbar[0];
    expect(dates.Widget).toBeDefined();
    expect(dates.styles?.options.map((o) => o.id)).toEqual(["georgian", "english"]);
    expect(dates.styles?.options[0].buttons.some((b) => b.text === "ძვ. წ.")).toBe(true);
    // Matching is common to every subject; history's own types are not.
    expect(getToolkit("math").questionTypes).toContain("matching");
    expect(getToolkit("math").questionTypes).not.toContain("timeline");
  });

  it("biology offers label-the-diagram, Georgian instruction templates, chemistry formulas and its own toolbar", () => {
    const biology = getToolkit("biology");
    for (const type of ["label-diagram", "punnett", "pedigree", "sequence", "codon-table", "food-web", "pyramid", "dichotomous-key", "taxonomy"]) {
      expect(biology.questionTypes).toContain(type);
    }
    const genetics = biology.toolbar.find((t) => t.id === "genetics")!;
    expect(genetics.Widget).toBeDefined();
    expect(genetics.buttons.some((b) => b.latex === "\\mathrm{X}^{A}")).toBe(true);
    expect(biology.chemistry).toBe(true);
    expect(biology.print.typography).toBe("georgian");
    expect(biology.instructionTemplates?.every((i) => i.ka && i.en)).toBe(true);
    const tab = biology.toolbar[0];
    expect(tab.Widget).toBeDefined();
    const [latin, georgian] = tab.styles!.options;
    expect(latin.buttons.length).toBe(georgian.buttons.length);
    expect(latin.buttons.some((b) => b.text === "μm")).toBe(true);
    expect(georgian.buttons.some((b) => b.text === "მკმ")).toBe(true);
    expect(biology.toolbar.some((t) => t.buttons.some((b) => b.chem?.includes("C6H12O6")))).toBe(true);
    expect(getToolkit("history").questionTypes).not.toContain("label-diagram");
  });
});

describe("subjectFromText", () => {
  it("recognises names in Georgian and English, ignoring case and spaces", () => {
    expect(subjectFromText("მათემატიკა")).toBe("math");
    expect(subjectFromText("  PHYSICS ")).toBe("physics");
    expect(subjectFromText("ქართული ენა და ლიტერატურა")).toBe("georgian");
    expect(subjectFromText("history")).toBe("history");
    expect(subjectFromText("ბიოლოგია")).toBe("biology");
  });
  it("returns null for anything else", () => {
    expect(subjectFromText("")).toBeNull();
    expect(subjectFromText("მუსიკა")).toBeNull();
  });
});
