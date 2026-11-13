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
