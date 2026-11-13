import { describe, expect, it } from "vitest";
import { aminoAcid, codonTable, codons, complement, readSequence, sequenceRows, transcribe, translate } from "./molecular";

describe("readSequence", () => {
  it("cleans what was typed", () => {
    expect(readSequence("5′-tac gga ctt-3′")).toEqual({ ok: true, bases: "TACGGACTT", kind: "dna" });
    expect(readSequence("AUG-GCC")).toEqual({ ok: true, bases: "AUGGCC", kind: "rna" });
  });
  it("explains mistakes", () => {
    expect(readSequence("  ")).toMatchObject({ ok: false, error: "empty" });
    expect(readSequence("ATGX")).toMatchObject({ ok: false, error: "character", detail: "X" });
    expect(readSequence("ATU")).toMatchObject({ ok: false, error: "mixed" });
  });
});

describe("strands", () => {
  it("complementary DNA and RNA strands", () => {
    expect(complement("ATGC", "dna")).toBe("TACG");
    expect(complement("AUGC", "rna")).toBe("UACG");
  });
  it("transcription from the template or the coding strand", () => {
    expect(transcribe("TACGGA", "template")).toBe("AUGCCU");
    expect(transcribe("ATGGCC", "coding")).toBe("AUGGCC");
  });
});

describe("genetic code", () => {
  it("has 64 codons: 61 amino-acid codons and 3 stops; AUG is Met", () => {
    const table = codonTable();
    expect(table).toHaveLength(64);
    expect(table.filter(([, a]) => a === "Stop").map(([c]) => c)).toEqual(["UAA", "UAG", "UGA"]);
    expect(new Set(table.map(([, a]) => a)).size).toBe(21);
    expect(aminoAcid("AUG")).toBe("Met");
    expect(aminoAcid("UGG")).toBe("Trp");
    expect(aminoAcid("GGG")).toBe("Gly");
    expect(aminoAcid("AU")).toBe("?");
  });
  it("translates codon by codon and stops at a stop codon", () => {
    expect(translate("AUGGCCUUUUAAGGG")).toEqual(["Met", "Ala", "Phe", "Stop"]);
    expect(translate("AUGGC")).toEqual(["Met"]);
    expect(codons("AUGGC")).toEqual(["AUG", "GC"]);
  });
});

describe("sequenceRows", () => {
  it("DNA template strand → complement, mRNA and amino acids", () => {
    const rows = sequenceRows("TAC CGG AAA ATT", ["complement", "mrna", "protein"], "template")!;
    expect(rows.map((r) => r.task)).toEqual(["given", "complement", "mrna", "protein"]);
    expect(rows[1].bases!.join("")).toBe("ATGGCCTTTTAA");
    expect(rows[2].bases!.join("")).toBe("AUGGCCUUUUAA");
    expect(rows[3].amino).toEqual(["Met", "Ala", "Phe", "Stop"]);
  });
  it("an RNA strand is the mRNA itself (no mRNA row)", () => {
    const rows = sequenceRows("AUGUGG", ["mrna", "protein"], "template")!;
    expect(rows.map((r) => r.task)).toEqual(["given", "protein"]);
    expect(rows[1].amino).toEqual(["Met", "Trp"]);
  });
  it("null for an unreadable strand", () => {
    expect(sequenceRows("AXG", ["protein"], "template")).toBeNull();
  });
});
