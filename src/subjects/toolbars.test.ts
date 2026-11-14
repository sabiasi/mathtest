import { convertLatexToMarkup } from "mathlive";
import { describe, expect, it } from "vitest";
import { allButtons, searchButtons } from "@/features/editor/toolbarSearch";
import { MATH_SHORTCUTS, MATH_TOOLBAR } from "./math/toolbar";
import { getToolkit, SUBJECTS } from "./registry";
import { buttonKey, type ToolbarButton } from "./types";

/** MathLive marks what it can't draw (an unknown command) with an error class. */
const draws = (latex: string) => !convertLatexToMarkup(latex).includes("ML__error");
/** The formula a button inserts, with its empty boxes filled in. */
const filled = (latex: string) => latex.replace(/#\?|#@/g, "{x}");

/** Symbols a subject deliberately shows twice (its own tab + a math tab). */
const ALLOWED_TWICE: Record<string, string[]> = {
  // Physics teachers need Δ and the micro prefix next to the units, not only among the Greek letters.
  physics: ["m:\\Delta", "m:\\mu"],
};

describe.each(SUBJECTS.map((s) => s.id))("the %s toolbar", (id) => {
  const toolkit = getToolkit(id);
  const buttons: { tab: string; button: ToolbarButton }[] = toolkit.toolbar.flatMap((tab) =>
    (tab.styles ? tab.styles.options.flatMap((o) => o.buttons) : tab.buttons).map((button) => ({ tab: tab.id, button })),
  );

  it("has a Georgian and an English name on every button", () => {
    for (const { tab, button } of buttons) {
      expect(button.ka.trim(), `${tab}: ${buttonKey(button)}`).not.toBe("");
      expect(button.en.trim(), `${tab}: ${buttonKey(button)}`).not.toBe("");
    }
  });

  it("draws every button and every formula it inserts", () => {
    for (const { tab, button } of buttons) {
      const where = `${tab}: ${buttonKey(button)}`;
      if (button.command) expect(button.label, where).toBeDefined();
      else if (button.chem !== undefined) expect(draws(button.display), where).toBe(true);
      else if (button.text === undefined && !button.format) {
        expect(draws(button.display), `${where} (button)`).toBe(true);
        expect(draws(filled(button.latex)), `${where} (inserted)`).toBe(true);
      }
    }
  });

  it("shows each symbol in one tab only", () => {
    const allowed = ALLOWED_TWICE[id] ?? [];
    const seen = new Map<string, string>();
    const twice: string[] = [];
    for (const tab of toolkit.toolbar) {
      // The writing styles of one tab (Latin / Georgian units) are alternatives, not duplicates.
      const keys = new Set((tab.styles ? tab.styles.options.flatMap((o) => o.buttons) : tab.buttons).map(buttonKey));
      for (const key of keys) {
        if (seen.has(key) && !allowed.includes(key)) twice.push(`${key} (${seen.get(key)} & ${tab.id})`);
        seen.set(key, tab.id);
      }
    }
    expect(twice).toEqual([]);
  });

  it("has unique tab ids and no empty tab", () => {
    const ids = toolkit.toolbar.map((tab) => tab.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tab of toolkit.toolbar) expect(tab.buttons.length, tab.id).toBeGreaterThan(0);
  });
});

describe("symbol search", () => {
  const math = allButtons(getToolkit("math"));
  const first = (query: string, language: "ka" | "en" = "ka") => searchButtons(math, query, language)[0]?.button.latex;

  it("finds symbols by their Georgian name, English name or what teachers type", () => {
    expect(first("ფესვი")).toBe("\\sqrt{#@}");
    expect(first("sqrt")).toBe("\\sqrt{#@}");
    expect(first("root", "en")).toBe("\\sqrt{#@}");
    expect(first("წილადი")).toBe("\\frac{#@}{#?}");
    expect(first("alpha", "en")).toBe("\\alpha");
    expect(first("ალფა")).toBe("\\alpha");
    expect(first("პი")).toBe("\\pi");
    expect(first("უსასრულობა")).toBe("\\infty");
    expect(first("matrix 3", "en")).toContain("pmatrix");
    expect(searchButtons(math, "zzzz", "ka")).toEqual([]);
    expect(searchButtons(math, "  ", "ka")).toEqual([]);
  });

  it("finds math symbols from tabs a subject doesn't show (physics: matrices, sets)", () => {
    const physics = allButtons(getToolkit("physics"));
    expect(getToolkit("physics").toolbar.some((tab) => tab.id === "sets")).toBe(false);
    expect(searchButtons(physics, "ეკუთვნის", "ka")[0]?.button.latex).toBe("\\in");
    // …and its own things: units and formulas.
    expect(searchButtons(physics, "ნიუტონი", "ka").length).toBeGreaterThan(0);
    expect(searchButtons(physics, "ომის", "ka").length + searchButtons(physics, "დენის ძალა", "ka").length).toBeGreaterThan(0);
  });

  it("every subject with formulas can reach every math symbol", () => {
    const all = MATH_TOOLBAR.flatMap((tab) => tab.buttons.map(buttonKey));
    for (const toolkit of SUBJECTS.filter((s) => s.formulas)) {
      const keys = new Set(allButtons(toolkit).map((item) => item.key));
      expect(all.filter((key) => !keys.has(key)), toolkit.id).toEqual([]);
    }
  });

  it("draws every typing shortcut's result", () => {
    for (const s of MATH_SHORTCUTS) expect(draws(s.display), s.keys).toBe(true);
  });
});
