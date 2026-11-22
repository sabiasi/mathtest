import { describe, expect, it } from "vitest";
import { findProblems } from "@/lib/checks";
import { climateAnswer, scaleAnswer } from "@/lib/geography";
import { usedImageIds } from "@/lib/images/imageMath";
import { builtinImageUrl } from "@/lib/images/builtinPictures";
import { cross, genotypeRatio } from "@/lib/genetics";
import { readSequence, translate, transcribe } from "@/lib/molecular";
import { buildCrossword, buildWordSearch } from "@/lib/puzzles";
import { totalPoints } from "@/lib/questions";
import { isRichTextEmpty } from "@/lib/richText";
import { normalizeTest } from "@/lib/storage/migrate";
import { buildVariants } from "@/lib/variants";
import { SUBJECT_IDS } from "@/subjects/ids";
import { getToolkit, offeredQuestionTypes } from "@/subjects/registry";
import { isTypeHidden } from "@/lib/offeredTypes";
import { fullSampleFor, getSample, isSampleId, sampleFor } from ".";

describe.each(SUBJECT_IDS)("the %s sample", (subjectId) => {
  // The whole sample file: every question type of the toolkit, hidden ones too.
  const sample = fullSampleFor(subjectId);

  it("has a fixed id, its subject and a full header", () => {
    expect(sample.id).toBe(`sample-${subjectId}`);
    expect(isSampleId(sample.id)).toBe(true);
    expect(getSample(sample.id)).toBe(sampleFor(subjectId));
    expect(sample.subjectId).toBe(subjectId);
    for (const field of ["schoolName", "title", "subject", "grade", "date"] as const) expect(sample[field], field).not.toBe("");
    expect(isRichTextEmpty(sample.instructions), "instructions").toBe(false);
    expect(sample.timeLimitMinutes).toBeGreaterThan(0);
    expect(totalPoints(sample.questions)).toBeGreaterThan(10);
  });

  it("uses every question type of its toolkit", () => {
    const used = new Set(sample.questions.map((q) => q.type));
    const missing = getToolkit(subjectId).questionTypes.filter((type) => !used.has(type));
    expect(missing).toEqual([]);
  });

  it("is valid saved data (nothing is dropped or changed when it is loaded)", () => {
    expect(normalizeTest(JSON.parse(JSON.stringify(sample)))).toEqual(sample);
    expect(new Set(sample.questions.map((q) => q.id)).size).toBe(sample.questions.length);
  });

  it("has a complete answer key and no problems to warn about", () => {
    expect(findProblems(sample)).toEqual([]);
  });

  it("uses only built-in pictures (nothing to upload)", () => {
    expect(usedImageIds([sample]).size).toBe(0);
    const ids = sample.questions.flatMap((q) => [
      ...q.images.filter((i) => !i.diagram).map((i) => i.imageId),
      ...(q.type === "map" && q.map ? [q.map.imageId] : []),
      ...(q.type === "picture-match" ? q.pictures.map((p) => p.imageId) : []),
    ]);
    for (const id of ids) expect(builtinImageUrl(id), id).not.toBeNull();
  });

  it("makes variants", () => {
    expect(buildVariants(sample).length).toBe(sample.variants.count);
  });

  it("is shown to teachers without hidden question types, still complete", () => {
    const shown = sampleFor(subjectId);
    expect(shown.questions.filter((q) => isTypeHidden(subjectId, q.type))).toEqual([]);
    const used = new Set(shown.questions.map((q) => q.type));
    expect(offeredQuestionTypes(subjectId).filter((type) => !used.has(type))).toEqual([]);
    expect(normalizeTest(JSON.parse(JSON.stringify(shown)))).toEqual(shown);
    expect(findProblems(shown)).toEqual([]);
    expect(totalPoints(shown.questions)).toBeGreaterThan(10);
    expect(buildVariants(shown).length).toBe(shown.variants.count);
  });
});

describe("worked answers", () => {
  it("geography: scale and climate", () => {
    const geo = fullSampleFor("geography");
    const scale = geo.questions.find((q) => q.type === "scale-calc")!;
    if (scale.type !== "scale-calc") throw new Error();
    expect(scale.rows.map((r) => scaleAnswer(r, scale.denominator, scale.realUnit))).toEqual([2, 3.75, 6]);
    const climate = geo.questions.find((q) => q.type === "climate-chart")!;
    if (climate.type !== "climate-chart") throw new Error();
    expect(climateAnswer(climate, "mean", "ka")).toBe("13,3 °C");
    expect(climateAnswer(climate, "range", "ka")).toBe("25 − 1,9 = 23,1 °C");
    expect(climateAnswer(climate, "total", "ka")).toBe("498 მმ");
    expect(climateAnswer(climate, "warmest", "ka")).toBe("ივლისი (25 °C)");
    expect(climateAnswer(climate, "wettest", "ka")).toBe("მაისი (77 მმ)");
  });

  it("biology: the cross and the DNA", () => {
    const result = cross("Aa", "Aa");
    expect(result.ok && genotypeRatio(result.cross).map((r) => r.count)).toEqual([1, 2, 1]);
    const seq = readSequence("TAC GGA CTT ATT");
    expect(seq.ok).toBe(true);
    if (!seq.ok) return;
    const mrna = transcribe(seq.bases, "template");
    expect(mrna).toBe("AUGCCUGAAUAA");
    expect(translate(mrna).slice(0, 3)).toEqual(["Met", "Pro", "Glu"]); // then Stop
  });

  it("english: the puzzles fit", () => {
    const en = fullSampleFor("english");
    for (const q of en.questions) {
      if (q.type === "crossword") expect(buildCrossword(q.entries, q.seed).placed.length).toBe(q.entries.length);
      if (q.type === "word-search") expect(buildWordSearch(q.words, q.size, q.allDirections, q.seed).unplaced).toEqual([]);
    }
  });
});
