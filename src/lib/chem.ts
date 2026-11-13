/**
 * Chemistry helpers (pure, no React). Formulas are written the way teachers
 * type them ("H2SO4", "Fe3+", "2H2 + O2 -> 2H2O") and drawn with mhchem's
 * \ce{…}, which MathLive understands: H2SO4 → H₂SO₄ automatically.
 */

/**
 * The one habit mhchem reads differently: "Fe3+" means Fe³⁺ to a teacher,
 * but mhchem would draw Fe₃⁺. A single element followed by a digit and a
 * sign is an ion charge: Fe3+ → Fe^3+, S2- → S^2-. ("NH4+" stays: NH₄⁺.)
 */
export function fixCharges(source: string): string {
  return source.replace(/(^|[\s(])([A-Z][a-z]?)(\d)([+-])(?=$|[\s)])/g, "$1$2^$3$4");
}

/** Typed chemistry → the LaTeX that is saved and drawn. */
export const chemLatex = (source: string) => `\\ce{${fixCharges(source)}}`;

/** The chemistry inside a saved \ce{…}, or null if the LaTeX isn't chemistry. */
export function chemSource(latex: string): string | null {
  const match = /^\\ce\{([\s\S]*)\}$/.exec(latex);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Equations: "2H2 + O2 -> 2H2O"
// ---------------------------------------------------------------------------

export type Term = { coefficient: number; formula: string };
export type Equation = { left: Term[]; arrow: string; right: Term[] };

// Arrows mhchem knows, with optional [above][below] conditions.
const ARROW = /\s*(<=>>|<<=>|<=>|<-->|<->|->|<-|=)((?:\[[^\]]*\]){0,2})\s*/;

function terms(side: string): Term[] {
  return side
    .split(/\s+\+\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = /^(\d+)\s*(.*)$/.exec(part);
      return match ? { coefficient: Number(match[1]), formula: match[2] } : { coefficient: 1, formula: part };
    });
}

/** Splits an equation into its two sides, or null if it has no arrow. */
export function parseEquation(source: string): Equation | null {
  const match = ARROW.exec(source);
  if (!match || match.index === undefined) return null;
  const left = terms(source.slice(0, match.index));
  const right = terms(source.slice(match.index + match[0].length));
  if (left.length === 0 || right.length === 0) return null;
  return { left, arrow: match[1] + match[2], right };
}

/**
 * How many atoms of each element one formula has: "Ca(OH)2" → Ca 1, O 2, H 2.
 * Knows brackets, hydrates (CuSO4*5H2O) and ignores charges, state symbols
 * (aq) and the ↑ / ↓ marks. Returns null for something it can't read.
 */
export function countAtoms(formula: string): Map<string, number> | null {
  const clean = fixCharges(formula.trim()) // "Fe3+" → "Fe^3+" first
    .replace(/\\overset\{[^}]*\}\{([^}]*)\}/g, "$1") // oxidation states above letters
    .replace(/\((?:s|l|g|aq)\)/g, "") // state symbols
    .replace(/\s+[v^]\s*$/, "") // ↓ precipitate, ↑ gas
    .replace(/\^\{?[0-9IVX]*[+-]?\}?/g, "") // charges and oxidation states written with ^
    .replace(/[+-]$/, "") // a charge without ^: "NH4+", "OH-"
    .replace(/·/g, "*")
    .trim();
  if (!clean) return null;

  const total = new Map<string, number>();
  for (const [index, part] of clean.split("*").entries()) {
    const lead = index > 0 ? /^(\d+)/.exec(part) : null;
    const multiplier = lead ? Number(lead[1]) : 1;
    const counted = countGroup(lead ? part.slice(lead[1].length) : part);
    if (!counted) return null;
    for (const [element, n] of counted) total.set(element, (total.get(element) ?? 0) + n * multiplier);
  }
  return total;
}

/** Counts a formula without hydrate dots: elements, digits and nested brackets. */
function countGroup(formula: string): Map<string, number> | null {
  const stack: Map<string, number>[] = [new Map()];
  let i = 0;
  const number = () => {
    const match = /^\d+/.exec(formula.slice(i));
    if (!match) return 1;
    i += match[0].length;
    return Number(match[0]);
  };
  const add = (into: Map<string, number>, element: string, n: number) => into.set(element, (into.get(element) ?? 0) + n);
  while (i < formula.length) {
    const char = formula[i];
    if (char === "(" || char === "[") {
      stack.push(new Map());
      i++;
    } else if (char === ")" || char === "]") {
      i++;
      const group = stack.pop();
      if (!group || stack.length === 0) return null;
      const n = number();
      for (const [element, count] of group) add(stack[stack.length - 1], element, count * n);
    } else {
      const match = /^[A-Z][a-z]?/.exec(formula.slice(i));
      if (!match) return null; // something that isn't a formula
      i += match[0].length;
      add(stack[stack.length - 1], match[0], number());
    }
  }
  return stack.length === 1 ? stack[0] : null;
}

export type BalanceCheck =
  | { status: "balanced" }
  | { status: "unbalanced"; differences: { element: string; left: number; right: number }[] }
  | { status: "unreadable" };

/** Is the equation balanced? Lists the elements that differ between the sides. */
export function checkBalance(source: string): BalanceCheck {
  const equation = parseEquation(source);
  if (!equation) return { status: "unreadable" };
  const side = (list: Term[]) => {
    const total = new Map<string, number>();
    for (const term of list) {
      const atoms = countAtoms(term.formula);
      if (!atoms) return null;
      for (const [element, n] of atoms) total.set(element, (total.get(element) ?? 0) + n * term.coefficient);
    }
    return total;
  };
  const left = side(equation.left);
  const right = side(equation.right);
  if (!left || !right) return { status: "unreadable" };
  const elements = [...new Set([...left.keys(), ...right.keys()])].sort();
  const differences = elements
    .map((element) => ({ element, left: left.get(element) ?? 0, right: right.get(element) ?? 0 }))
    .filter((d) => d.left !== d.right);
  return differences.length === 0 ? { status: "balanced" } : { status: "unbalanced", differences };
}
