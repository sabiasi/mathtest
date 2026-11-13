import { describe, expect, it } from "vitest";
import { chemLatex, chemSource, checkBalance, countAtoms, fixCharges, parseEquation } from "./chem";

describe("formulas", () => {
  it("reads Fe3+ as a charge, but NH4+ as a subscript", () => {
    expect(fixCharges("Fe3+")).toBe("Fe^3+");
    expect(fixCharges("Al3+ + 3OH-")).toBe("Al^3+ + 3OH-");
    expect(fixCharges("S2-")).toBe("S^2-");
    expect(fixCharges("NH4+")).toBe("NH4+");
    expect(fixCharges("Fe^3+")).toBe("Fe^3+");
  });

  it("wraps typed chemistry in \\ce{} and back", () => {
    expect(chemLatex("H2SO4")).toBe("\\ce{H2SO4}");
    expect(chemSource("\\ce{2H2 + O2 -> 2H2O}")).toBe("2H2 + O2 -> 2H2O");
    expect(chemSource("x^2")).toBeNull();
  });

  it("counts atoms with brackets, hydrates, charges and states", () => {
    const counts = (f: string) => Object.fromEntries(countAtoms(f) ?? []);
    expect(counts("H2SO4")).toEqual({ H: 2, S: 1, O: 4 });
    expect(counts("Ca(OH)2")).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(counts("Al2(SO4)3")).toEqual({ Al: 2, S: 3, O: 12 });
    expect(counts("CuSO4*5H2O")).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
    expect(counts("SO4^2-")).toEqual({ S: 1, O: 4 });
    expect(counts("Fe3+")).toEqual({ Fe: 1 });
    expect(counts("NH4+")).toEqual({ N: 1, H: 4 });
    expect(counts("OH-")).toEqual({ O: 1, H: 1 });
    expect(counts("NaCl(aq)")).toEqual({ Na: 1, Cl: 1 });
    expect(counts("CO2 ^")).toEqual({ C: 1, O: 2 });
    expect(counts("K3[Fe(CN)6]")).toEqual({ K: 3, Fe: 1, C: 6, N: 6 });
    expect(countAtoms("hello")).toBeNull();
  });
});

describe("equations", () => {
  it("splits sides, coefficients and the arrow (with conditions)", () => {
    expect(parseEquation("2H2 + O2 -> 2H2O")).toEqual({
      left: [{ coefficient: 2, formula: "H2" }, { coefficient: 1, formula: "O2" }],
      arrow: "->",
      right: [{ coefficient: 2, formula: "H2O" }],
    });
    expect(parseEquation("CaCO3 ->[t^\\circ] CaO + CO2 ^")?.arrow).toBe("->[t^\\circ]");
    expect(parseEquation("N2 + 3H2 <=> 2NH3")?.arrow).toBe("<=>");
    expect(parseEquation("H2O")).toBeNull();
  });

  it("checks whether an equation is balanced", () => {
    expect(checkBalance("2H2 + O2 -> 2H2O")).toEqual({ status: "balanced" });
    expect(checkBalance("2Al + 3H2SO4 -> Al2(SO4)3 + 3H2 ^")).toEqual({ status: "balanced" });
    expect(checkBalance("H2 + O2 -> H2O")).toEqual({ status: "unbalanced", differences: [{ element: "O", left: 2, right: 1 }] });
    expect(checkBalance("Fe3+ + 3OH- -> Fe(OH)3 v")).toEqual({ status: "balanced" });
    expect(checkBalance("nonsense")).toEqual({ status: "unreadable" });
  });
});
