/**
 * Molecular biology: DNA / RNA sequences, the complementary strand,
 * transcription to mRNA and translation with the genetic code.
 * Pure functions — easy to test.
 */

export type NucleicAcid = "dna" | "rna";
export type SequenceResult = { ok: true; bases: string; kind: NucleicAcid } | { ok: false; error: "empty" | "character" | "mixed"; detail?: string };

/** The longest sequence a question can have (14 codons fit two printed rows). */
export const MAX_BASES = 42;

/**
 * Cleans a typed sequence: capitals, no spaces, dashes or 5′/3′ marks.
 * DNA has T, RNA has U (both together is a mistake).
 */
export function readSequence(input: string): SequenceResult {
  const bases = input
    .toUpperCase()
    .replace(/[53]['′’]?\s*-?/g, (m) => (/[53]['′’]/.test(m) ? "" : m))
    .replace(/[\s\-–—.,·|]/g, "");
  if (!bases) return { ok: false, error: "empty" };
  const wrong = bases.match(/[^ACGTU]/);
  if (wrong) return { ok: false, error: "character", detail: wrong[0] };
  if (bases.includes("T") && bases.includes("U")) return { ok: false, error: "mixed" };
  return { ok: true, bases: bases.slice(0, MAX_BASES), kind: bases.includes("U") ? "rna" : "dna" };
}

const DNA_PAIR: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };
const RNA_PAIR: Record<string, string> = { A: "U", U: "A", G: "C", C: "G" };

/** The complementary strand (A–T, G–C for DNA; A–U, G–C for RNA). */
export function complement(bases: string, kind: NucleicAcid): string {
  const pair = kind === "dna" ? DNA_PAIR : RNA_PAIR;
  return [...bases].map((b) => pair[b] ?? b).join("");
}

/**
 * mRNA made from a DNA strand. From the template strand the mRNA is its
 * complement (A→U, T→A, G→C, C→G); from the coding strand it is the same
 * sequence with U instead of T.
 */
export function transcribe(dna: string, strand: "template" | "coding"): string {
  if (strand === "coding") return dna.replace(/T/g, "U");
  return [...dna].map((b) => ({ A: "U", T: "A", G: "C", C: "G" })[b] ?? b).join("");
}

// ---------------------------------------------------------------------------
// The genetic code (mRNA codons → amino acids)
// ---------------------------------------------------------------------------

export const BASES_ORDER = ["U", "C", "A", "G"] as const;

/** 64 codons in the classic table order (first base U C A G, second base U C A G, third base U C A G). */
const CODE =
  // UUx       UCx       UAx         UGx
  "Phe Phe Leu Leu Ser Ser Ser Ser Tyr Tyr Stop Stop Cys Cys Stop Trp " +
  // CUx       CCx       CAx         CGx
  "Leu Leu Leu Leu Pro Pro Pro Pro His His Gln Gln Arg Arg Arg Arg " +
  // AUx       ACx       AAx         AGx
  "Ile Ile Ile Met Thr Thr Thr Thr Asn Asn Lys Lys Ser Ser Arg Arg " +
  // GUx       GCx       GAx         GGx
  "Val Val Val Val Ala Ala Ala Ala Asp Asp Glu Glu Gly Gly Gly Gly";

/** First base → second base → third base in the order U C A G; index = 16·first + 4·second + third. */
const AMINO = CODE.split(" ");
const index = (b: string) => BASES_ORDER.indexOf(b as (typeof BASES_ORDER)[number]);

/** The amino acid of one mRNA codon ("AUG" → "Met", "UAA" → "Stop"), or "?" for an incomplete codon. */
export function aminoAcid(codon: string): string {
  if (codon.length !== 3 || [...codon].some((b) => index(b) < 0)) return "?";
  return AMINO[16 * index(codon[0]) + 4 * index(codon[1]) + index(codon[2])];
}

/** Every codon with its amino acid: [["UUU", "Phe"], …] in the table's order. */
export function codonTable(): [string, string][] {
  const result: [string, string][] = [];
  for (const a of BASES_ORDER) for (const b of BASES_ORDER) for (const c of BASES_ORDER) result.push([a + b + c, aminoAcid(a + b + c)]);
  return result;
}

/** mRNA → amino acids, codon by codon from the first base; stops after a stop codon. A leftover 1–2 bases are ignored. */
export function translate(mrna: string): string[] {
  const result: string[] = [];
  for (let i = 0; i + 3 <= mrna.length; i += 3) {
    const amino = aminoAcid(mrna.slice(i, i + 3));
    result.push(amino);
    if (amino === "Stop") break;
  }
  return result;
}

/** "AUGGCC" → ["AUG", "GCC"] (the last group may be shorter). */
export function codons(bases: string): string[] {
  const result: string[] = [];
  for (let i = 0; i < bases.length; i += 3) result.push(bases.slice(i, i + 3));
  return result;
}

/** The 20 amino acids (3-letter names) with their Georgian and English names, for the codon table's legend. */
export const AMINO_NAMES: Record<string, { ka: string; en: string }> = {
  Ala: { ka: "ალანინი", en: "alanine" },
  Arg: { ka: "არგინინი", en: "arginine" },
  Asn: { ka: "ასპარაგინი", en: "asparagine" },
  Asp: { ka: "ასპარაგინის მჟავა", en: "aspartic acid" },
  Cys: { ka: "ცისტეინი", en: "cysteine" },
  Gln: { ka: "გლუტამინი", en: "glutamine" },
  Glu: { ka: "გლუტამინის მჟავა", en: "glutamic acid" },
  Gly: { ka: "გლიცინი", en: "glycine" },
  His: { ka: "ჰისტიდინი", en: "histidine" },
  Ile: { ka: "იზოლეიცინი", en: "isoleucine" },
  Leu: { ka: "ლეიცინი", en: "leucine" },
  Lys: { ka: "ლიზინი", en: "lysine" },
  Met: { ka: "მეთიონინი (სტარტი)", en: "methionine (start)" },
  Phe: { ka: "ფენილალანინი", en: "phenylalanine" },
  Pro: { ka: "პროლინი", en: "proline" },
  Ser: { ka: "სერინი", en: "serine" },
  Thr: { ka: "ტრეონინი", en: "threonine" },
  Trp: { ka: "ტრიპტოფანი", en: "tryptophan" },
  Tyr: { ka: "ტიროზინი", en: "tyrosine" },
  Val: { ka: "ვალინი", en: "valine" },
};

// ---------------------------------------------------------------------------
// A sequence question: which rows students complete
// ---------------------------------------------------------------------------

export type SequenceTask = "complement" | "mrna" | "protein";

export type SequenceRow = { task: SequenceTask | "given"; bases: string[] | null; amino: string[] | null };

/**
 * The rows of a sequence question, worked out from the given strand:
 *   given (DNA or RNA) → complementary strand → mRNA → amino acids.
 * mRNA comes from a DNA strand (template or coding); if the given strand is
 * already RNA, it is the mRNA. Returns null if the strand can't be read.
 */
export function sequenceRows(given: string, tasks: readonly SequenceTask[], strand: "template" | "coding"): SequenceRow[] | null {
  const read = readSequence(given);
  if (!read.ok) return null;
  const rows: SequenceRow[] = [{ task: "given", bases: [...read.bases], amino: null }];
  const mrna = read.kind === "rna" ? read.bases : transcribe(read.bases, strand);
  for (const task of tasks) {
    if (task === "complement") rows.push({ task, bases: [...complement(read.bases, read.kind)], amino: null });
    if (task === "mrna" && read.kind === "dna") rows.push({ task, bases: [...mrna], amino: null });
    if (task === "protein") rows.push({ task, bases: null, amino: translate(mrna) });
  }
  return rows;
}
