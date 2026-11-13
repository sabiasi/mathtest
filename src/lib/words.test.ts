import { describe, expect, it } from "vitest";
import { findRef, tokenize, wordRefs } from "./words";

describe("tokenize", () => {
  it("splits words from punctuation and spaces", () => {
    expect(tokenize("და, ის წავიდა.").map((t) => t.text)).toEqual(["და", ", ", "ის", " ", "წავიდა", "."]);
    expect(tokenize("ვინმე-ვინმე").map((t) => t.isWord)).toEqual([true]);
  });
});

describe("wordRefs / findRef", () => {
  it("tells repeated words apart, and finds them again after edits elsewhere", () => {
    const tokens = tokenize("და მე და შენ");
    expect(wordRefs(tokens).filter(Boolean)).toEqual([
      { word: "და", occurrence: 0 },
      { word: "მე", occurrence: 0 },
      { word: "და", occurrence: 1 },
      { word: "შენ", occurrence: 0 },
    ]);
    const edited = tokenize("ახლა და მე და შენ ერთად");
    expect(edited[findRef(edited, { word: "და", occurrence: 1 })].text).toBe("და");
    expect(findRef(edited, { word: "ის", occurrence: 0 })).toBe(-1);
  });
});
