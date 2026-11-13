import { describe, expect, it } from "vitest";
import {
  cross,
  gametes,
  gameteText,
  genotypeInputLatex,
  genotypeRatio,
  genotypeText,
  parseGenotype,
  phenotypeRatio,
  ratioNumbers,
  ratioText,
} from "./genetics";

const text = (input: string) => {
  const parsed = parseGenotype(input);
  return parsed.ok ? genotypeText(parsed.genotype) : parsed.error;
};
const square = (mother: string, father: string) => {
  const result = cross(mother, father);
  if (!result.ok) throw new Error(result.error);
  return result.cross;
};

describe("parseGenotype", () => {
  it("reads autosomal genes, dominant allele first", () => {
    expect(text("Aa")).toBe("Aa");
    expect(text("aA")).toBe("Aa");
    expect(text("AaBb")).toBe("AaBb");
    expect(text(" aa BB ")).toBe("aaBB");
  });
  it("reads sex-linked genes typed in several ways", () => {
    expect(text("XAXa")).toBe("XᴬXᵃ");
    expect(text("XᵃXᴬ")).toBe("XᴬXᵃ");
    expect(text("X^aY")).toBe("XᵃY");
    expect(text("YXa")).toBe("XᵃY");
    expect(text("AaXBXb")).toBe("AaXᴮXᵇ");
  });
  it("explains what is wrong", () => {
    expect(text("")).toBe("empty");
    expect(text("Aab")).toBe("unpaired");
    expect(text("A1")).toBe("character");
    expect(text("XX")).toBe("xAllele");
    expect(text("XAYY")).toBe("sexChromosomes");
    expect(text("XAXb")).toBe("twoSexGenes");
    expect(text("AaXAXa")).toBe("sameLetter");
    expect(text("AaBbCcDd")).toBe("tooManyGenes");
  });
});

describe("gametes", () => {
  it("lists the different gametes with how often they occur", () => {
    const parsed = parseGenotype("AaBb");
    if (!parsed.ok) throw new Error();
    expect(gametes(parsed.genotype).map((g) => gameteText(g.alleles))).toEqual(["AB", "Ab", "aB", "ab"]);
    const homo = parseGenotype("AA");
    if (!homo.ok) throw new Error();
    expect(gametes(homo.genotype)).toEqual([{ alleles: [{ kind: "auto", letter: "A" }], count: 2 }]);
  });
});

describe("cross", () => {
  it("monohybrid Aa × Aa: 1 AA : 2 Aa : 1 aa, 3 : 1", () => {
    const c = square("Aa", "Aa");
    expect(c.cells.map((row) => row.map(genotypeText))).toEqual([
      ["AA", "Aa"],
      ["Aa", "aa"],
    ]);
    expect(ratioText(genotypeRatio(c))).toBe("1 AA : 2 Aa : 1 aa");
    expect(ratioText(phenotypeRatio(c))).toBe("3 A_ : 1 aa");
    expect(ratioText(phenotypeRatio(c, { a: { dominant: "ყვითელი", recessive: "მწვანე" } }))).toBe("3 ყვითელი : 1 მწვანე");
  });

  it("dihybrid AaBb × AaBb: 9 : 3 : 3 : 1", () => {
    const c = square("AaBb", "AaBb");
    expect(c.rows).toHaveLength(4);
    expect(ratioText(phenotypeRatio(c))).toBe("9 A_ B_ : 3 A_ bb : 3 aa B_ : 1 aa bb");
    expect(ratioNumbers(genotypeRatio(c))).toBe("1 : 2 : 1 : 2 : 4 : 2 : 1 : 2 : 1");
  });

  it("counts a homozygous parent's gamete twice (AA × Aa → 1 : 1)", () => {
    expect(ratioText(genotypeRatio(square("AA", "Aa")))).toBe("1 AA : 1 Aa");
    expect(ratioText(phenotypeRatio(square("aa", "aa")))).toBe("1 aa");
  });

  it("test cross and gene order: Aa × aa, BbAa × AaBb", () => {
    expect(ratioText(genotypeRatio(square("Aa", "aa")))).toBe("1 Aa : 1 aa");
    expect(square("BbAa", "AaBb").rows).toHaveLength(4);
  });

  it("sex-linked: XᴬXᵃ × XᴬY — every daughter healthy, half of the sons not", () => {
    const c = square("XAXa", "XAY");
    expect(c.cols.map((g) => gameteText(g.alleles))).toEqual(["Xᴬ", "Y"]);
    expect(ratioText(genotypeRatio(c))).toBe("1 XᴬXᴬ : 1 XᴬXᵃ : 1 XᴬY : 1 XᵃY");
    expect(ratioText(phenotypeRatio(c))).toBe("2 ♀ Xᴬ_ : 1 ♂ XᴬY : 1 ♂ XᵃY");
    expect(ratioText(phenotypeRatio(c, { a: { dominant: "ჯანმრთელი", recessive: "ჰემოფილია" } }))).toBe("2 ♀ ჯანმრთელი : 1 ♂ ჯანმრთელი : 1 ♂ ჰემოფილია");
  });

  it("refuses crosses that don't make sense", () => {
    expect(cross("Aa", "AaBb")).toMatchObject({ ok: false, error: "genes" });
    expect(cross("XAY", "XAXa")).toMatchObject({ ok: false, error: "sexes" });
    expect(cross("Ab", "Aa")).toMatchObject({ ok: false, error: "mother" });
  });
});

describe("genotypeInputLatex", () => {
  it("makes a formula: alleles italic, X and Y upright", () => {
    expect(genotypeInputLatex("XAXa")).toBe("\\mathrm{X}^{A}\\mathrm{X}^{a}");
    expect(genotypeInputLatex("Aa")).toBe("Aa");
    expect(genotypeInputLatex("XaY")).toBe("\\mathrm{X}^{a}\\mathrm{Y}");
    expect(genotypeInputLatex("A?")).toBeNull();
  });
});
