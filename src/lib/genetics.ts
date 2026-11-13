/**
 * Genetics (biology): reading genotypes typed by a teacher, making gametes,
 * filling a Punnett square, and counting genotype / phenotype ratios.
 * Pure functions — easy to test.
 *
 * How genotypes are typed:
 *   Aa, AaBb, AABbcc          one letter per allele; capital = dominant
 *   XAXa, XᴬXᵃ, X^AX^a        sex-linked alleles on the X chromosome
 *   XaY, XᵃY                  a male (one X, one Y)
 *   AaXBXb                    both together
 * Complete dominance only (codominance, e.g. blood groups, is not counted).
 */

export type Allele = { kind: "auto"; letter: string } | { kind: "X"; letter: string } | { kind: "Y" };
export type Locus = { gene: string; sexLinked: boolean; alleles: [Allele, Allele] };
export type Genotype = Locus[];

export type GenotypeError = "empty" | "character" | "unpaired" | "xAllele" | "sexChromosomes" | "twoSexGenes" | "sameLetter" | "tooManyGenes";
export type ParseResult = { ok: true; genotype: Genotype } | { ok: false; error: GenotypeError; detail?: string };

/** At most 3 genes (an 8 × 8 square). */
export const MAX_GENES = 3;

// Superscript letters people paste from documents (Xᴬ, Xᵃ) → plain letters.
const SUPERSCRIPTS: Record<string, string> = {
  ᴬ: "A", ᴮ: "B", ᴰ: "D", ᴱ: "E", ᴳ: "G", ᴴ: "H", ᴵ: "I", ᴶ: "J", ᴷ: "K", ᴸ: "L", ᴹ: "M", ᴺ: "N", ᴼ: "O", ᴾ: "P", ᴿ: "R", ᵀ: "T", ᵁ: "U", ⱽ: "V", ᵂ: "W",
  ᵃ: "a", ᵇ: "b", ᶜ: "c", ᵈ: "d", ᵉ: "e", ᶠ: "f", ᵍ: "g", ʰ: "h", ⁱ: "i", ʲ: "j", ᵏ: "k", ˡ: "l", ᵐ: "m", ⁿ: "n", ᵒ: "o", ᵖ: "p", ʳ: "r", ˢ: "s", ᵗ: "t", ᵘ: "u", ᵛ: "v", ʷ: "w", ʸ: "y", ᶻ: "z",
};
const TO_SUPERSCRIPT: Record<string, string> = Object.fromEntries(Object.entries(SUPERSCRIPTS).map(([sup, plain]) => [plain, sup]));

const isLetter = (c: string | undefined) => !!c && /^[A-Za-z]$/.test(c);
const isDominant = (allele: Allele) => allele.kind !== "Y" && allele.letter === allele.letter.toUpperCase();
const geneOf = (letter: string) => letter.toLowerCase();

/** Reads a typed genotype. */
export function parseGenotype(input: string): ParseResult {
  const text = [...input.replace(/\s+/g, "")].map((c) => (SUPERSCRIPTS[c] ? `^${SUPERSCRIPTS[c]}` : c)).join("");
  if (!text) return { ok: false, error: "empty" };

  const tokens: Allele[] = [];
  for (let i = 0; i < text.length; ) {
    const c = text[i];
    if (c === "X") {
      let j = i + 1;
      if (text[j] === "^") j++;
      const letter = text[j];
      if (!isLetter(letter) || letter === "X" || letter === "Y") return { ok: false, error: "xAllele" };
      tokens.push({ kind: "X", letter });
      i = j + 1;
    } else if (c === "Y") {
      tokens.push({ kind: "Y" });
      i++;
    } else if (isLetter(c)) {
      tokens.push({ kind: "auto", letter: c });
      i++;
    } else return { ok: false, error: "character", detail: c };
  }

  const loci: Genotype = [];
  // Autosomal genes, in the order they first appear.
  for (const token of tokens) {
    if (token.kind !== "auto") continue;
    const gene = geneOf(token.letter);
    if (loci.some((l) => l.gene === gene)) continue;
    const alleles = tokens.filter((t) => t.kind === "auto" && geneOf(t.letter) === gene);
    if (alleles.length !== 2) return { ok: false, error: "unpaired", detail: token.letter.toUpperCase() };
    loci.push({ gene, sexLinked: false, alleles: sortAlleles(alleles as [Allele, Allele]) });
  }
  // The sex chromosomes: XX or XY, with one gene on the X.
  const sex = tokens.filter((t) => t.kind !== "auto");
  if (sex.length > 0) {
    const xs = sex.filter((t): t is Extract<Allele, { kind: "X" }> => t.kind === "X");
    if (sex.length !== 2 || xs.length === 0) return { ok: false, error: "sexChromosomes" };
    if (new Set(xs.map((x) => geneOf(x.letter))).size > 1) return { ok: false, error: "twoSexGenes" };
    // "AaXᴬXᵃ": one letter can't name two different genes.
    if (loci.some((l) => l.gene === geneOf(xs[0].letter))) return { ok: false, error: "sameLetter", detail: xs[0].letter.toUpperCase() };
    const position = tokens.findIndex((t) => t.kind !== "auto");
    const locus: Locus = { gene: geneOf(xs[0].letter), sexLinked: true, alleles: sortAlleles(sex as [Allele, Allele]) };
    // Keep the order the teacher typed: "XᴬXᵃBb" stays sex-linked first.
    const autosBefore = new Set(tokens.slice(0, position).filter((t) => t.kind === "auto").map((t) => geneOf((t as { letter: string }).letter))).size;
    loci.splice(autosBefore, 0, locus);
  }
  if (loci.length > MAX_GENES) return { ok: false, error: "tooManyGenes" };
  return { ok: true, genotype: loci };
}

/** Dominant first (A before a), X before Y. */
function sortAlleles([a, b]: [Allele, Allele]): [Allele, Allele] {
  const rank = (x: Allele) => (x.kind === "Y" ? 2 : isDominant(x) ? 0 : 1);
  return rank(b) < rank(a) ? [b, a] : [a, b];
}

const alleleText = (allele: Allele) => (allele.kind === "Y" ? "Y" : allele.kind === "X" ? `X${TO_SUPERSCRIPT[allele.letter] ?? `^${allele.letter}`}` : allele.letter);

/** As plain text: "AaBb", "XᴬXᵃ", "XᵃY". */
export function genotypeText(genotype: Genotype): string {
  return genotype.map((locus) => locus.alleles.map(alleleText).join("")).join("");
}

/** A gamete (one allele per gene) as plain text: "AB", "Xᴬ", "Y". */
export function gameteText(gamete: Allele[]): string {
  return gamete.map(alleleText).join("");
}

/**
 * As LaTeX for a formula: allele letters are italic (the math default),
 * X and Y upright, with the allele as an exponent: \mathrm{X}^{A}.
 */
export function genotypeLatex(genotype: Genotype): string {
  return genotype
    .map((locus) =>
      locus.alleles.map((a) => (a.kind === "Y" ? "\\mathrm{Y}" : a.kind === "X" ? `\\mathrm{X}^{${a.letter}}` : a.letter)).join(""),
    )
    .join("");
}

/** Typed text → LaTeX, or null if it isn't a genotype. */
export function genotypeInputLatex(input: string): string | null {
  const parsed = parseGenotype(input);
  return parsed.ok ? genotypeLatex(parsed.genotype) : null;
}

// ---------------------------------------------------------------------------
// Crossing
// ---------------------------------------------------------------------------

export type Gamete = { alleles: Allele[]; count: number };

/** The different gametes of a parent (AA gives one gamete "A", counted twice). */
export function gametes(genotype: Genotype): Gamete[] {
  let combos: Allele[][] = [[]];
  for (const locus of genotype) combos = combos.flatMap((combo) => locus.alleles.map((allele) => [...combo, allele]));
  const result: Gamete[] = [];
  for (const combo of combos) {
    const key = gameteText(combo);
    const found = result.find((g) => gameteText(g.alleles) === key);
    if (found) found.count++;
    else result.push({ alleles: combo, count: 1 });
  }
  return result;
}

/** The offspring of two gametes. */
export function fertilise(egg: Allele[], sperm: Allele[], genes: Genotype): Genotype {
  return genes.map((locus, i) => ({ gene: locus.gene, sexLinked: locus.sexLinked, alleles: sortAlleles([egg[i], sperm[i]]) }));
}

export type CrossError = "mother" | "father" | "genes" | "sexes";
export type Cross = {
  /** The mother's gametes (rows) and the father's (columns). */
  rows: Gamete[];
  cols: Gamete[];
  cells: Genotype[][];
};

/**
 * The Punnett square for ♀ mother × ♂ father. Both must have the same genes;
 * for a sex-linked gene the mother is XX and the father XY.
 */
export function cross(mother: string, father: string): { ok: true; cross: Cross; mother: Genotype; father: Genotype } | { ok: false; error: CrossError; parse?: ParseResult } {
  const m = parseGenotype(mother);
  if (!m.ok) return { ok: false, error: "mother", parse: m };
  const f = parseGenotype(father);
  if (!f.ok) return { ok: false, error: "father", parse: f };
  const genesOf = (g: Genotype) => g.map((l) => `${l.sexLinked ? "x" : ""}${l.gene}`).join(",");
  // The same genes in the same order (sorted, so "BbAa" × "AaBb" is fine).
  const order = (g: Genotype) => [...g].sort((a, b) => (a.sexLinked === b.sexLinked ? a.gene.localeCompare(b.gene) : a.sexLinked ? 1 : -1));
  const mg = order(m.genotype);
  const fg = order(f.genotype);
  if (genesOf(mg) !== genesOf(fg)) return { ok: false, error: "genes" };
  const sexLocus = mg.findIndex((l) => l.sexLinked);
  if (sexLocus >= 0 && (mg[sexLocus].alleles.some((a) => a.kind === "Y") || !fg[sexLocus].alleles.some((a) => a.kind === "Y"))) {
    return { ok: false, error: "sexes" };
  }
  const rows = gametes(mg);
  const cols = gametes(fg);
  const cells = rows.map((r) => cols.map((c) => fertilise(r.alleles, c.alleles, mg)));
  return { ok: true, cross: { rows, cols, cells }, mother: mg, father: fg };
}

// ---------------------------------------------------------------------------
// Ratios
// ---------------------------------------------------------------------------

/** Names for the two forms of a trait, e.g. gene "a": dominant "ყვითელი", recessive "მწვანე". Empty = letters. */
export type TraitNames = Record<string, { dominant: string; recessive: string }>;

export type RatioPart = { label: string; count: number };

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

function reduce(parts: RatioPart[]): RatioPart[] {
  const divisor = parts.reduce((g, p) => gcd(g, p.count), 0) || 1;
  return parts.map((p) => ({ ...p, count: p.count / divisor }));
}

const isFemale = (genotype: Genotype) => genotype.some((l) => l.sexLinked) && !genotype.some((l) => l.alleles.some((a) => a.kind === "Y"));
const isMale = (genotype: Genotype) => genotype.some((l) => l.alleles.some((a) => a.kind === "Y"));

/** One gene's phenotype: dominant if any allele is dominant (a male has one X). */
const showsDominant = (locus: Locus) => locus.alleles.some((a) => a.kind !== "Y" && isDominant(a));

/** A phenotype as a label: trait names if given, else "A_" / "aa" (sex-linked: "Xᴬ_" / "XᵃXᵃ" / "XᴬY" / "XᵃY"). */
export function phenotypeLabel(genotype: Genotype, traits: TraitNames = {}): string {
  const sex = isFemale(genotype) ? "♀" : isMale(genotype) ? "♂" : "";
  const parts = genotype.map((locus) => {
    const dominant = showsDominant(locus);
    const named = traits[locus.gene];
    const name = named ? (dominant ? named.dominant : named.recessive).trim() : "";
    if (name) return name;
    const big = locus.gene.toUpperCase();
    if (!locus.sexLinked) return dominant ? `${big}_` : `${locus.gene}${locus.gene}`;
    if (isMale(genotype)) return `${alleleText({ kind: "X", letter: dominant ? big : locus.gene })}Y`;
    return dominant ? `${alleleText({ kind: "X", letter: big })}_` : alleleText({ kind: "X", letter: locus.gene }).repeat(2);
  });
  return [sex, parts.join(" ")].filter(Boolean).join(" ");
}

/** Sort key: more dominant alleles first (AA, Aa, aa), females before males. */
function rank(genotype: Genotype): number[] {
  return [isMale(genotype) ? 1 : 0, ...genotype.map((l) => -l.alleles.filter((a) => a.kind !== "Y" && isDominant(a)).length)];
}
function rankPhenotype(genotype: Genotype): number[] {
  return [isMale(genotype) ? 1 : 0, ...genotype.map((l) => (showsDominant(l) ? 0 : 1))];
}
const compare = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
  return 0;
};

function count(c: Cross, key: (g: Genotype) => string, order: (g: Genotype) => number[]): RatioPart[] {
  const found = new Map<string, { count: number; rank: number[] }>();
  c.cells.forEach((row, r) =>
    row.forEach((genotype, k) => {
      const label = key(genotype);
      const weight = c.rows[r].count * c.cols[k].count;
      const entry = found.get(label) ?? { count: 0, rank: order(genotype) };
      entry.count += weight;
      found.set(label, entry);
    }),
  );
  const parts = [...found.entries()].sort((a, b) => compare(a[1].rank, b[1].rank)).map(([label, v]) => ({ label, count: v.count }));
  return reduce(parts);
}

/** "1 AA : 2 Aa : 1 aa" as parts. */
export function genotypeRatio(c: Cross): RatioPart[] {
  return count(c, genotypeText, rank);
}

/** "3 A_ : 1 aa" (or with trait names) as parts. */
export function phenotypeRatio(c: Cross, traits: TraitNames = {}): RatioPart[] {
  return count(c, (g) => phenotypeLabel(g, traits), rankPhenotype);
}

/** Parts → "1 AA : 2 Aa : 1 aa". */
export function ratioText(parts: RatioPart[]): string {
  return parts.map((p) => `${p.count} ${p.label}`).join(" : ");
}

/** Just the numbers: "1 : 2 : 1". */
export function ratioNumbers(parts: RatioPart[]): string {
  return parts.map((p) => p.count).join(" : ");
}
