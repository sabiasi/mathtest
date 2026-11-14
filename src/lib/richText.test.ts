import { describe, expect, it } from "vitest";
import {
  cleanRichText,
  docToRichText,
  isRichTextEmpty,
  normalizeRichText,
  richTextToDoc,
  type RichText,
} from "./richText";

const sample: RichText = [
  { type: "text", text: "იპოვეთ " },
  { type: "math", latex: "\\frac{1}{2}" },
  { type: "text", text: " ის მნიშვნელობა\nმეორე ხაზი" },
];

describe("richTextToDoc / docToRichText", () => {
  it("round-trips text, formulas and line breaks", () => {
    expect(docToRichText(richTextToDoc(sample))).toEqual(sample);
  });

  it("keeps bold / italic / underline / box formatting", () => {
    const formatted: RichText = [
      { type: "text", text: "Choose the " },
      { type: "text", text: "correct", marks: ["bold", "underline"] },
      { type: "text", text: " word." },
    ];
    expect(docToRichText(richTextToDoc(formatted))).toEqual(formatted);
    expect(richTextToDoc(formatted).content?.[0].content?.[1].marks).toEqual([{ type: "bold" }, { type: "underline" }]);
    // Saved data with unknown marks is cleaned; plain text stays without "marks".
    expect(normalizeRichText([{ type: "text", text: "a", marks: ["bold", "glitter"] }, { type: "text", text: "b" }])).toEqual([
      { type: "text", text: "a", marks: ["bold"] },
      { type: "text", text: "b" },
    ]);
  });

  it("keeps a formula inside a word box (the box mark is saved on the formula too)", () => {
    const boxed: RichText = [
      { type: "text", text: "x = ", marks: ["box"] },
      { type: "math", latex: "\\frac{1}{2}", marks: ["box"] },
      { type: "text", text: " cm", marks: ["bold", "box"] },
    ];
    expect(docToRichText(richTextToDoc(boxed))).toEqual(boxed);
    expect(normalizeRichText(JSON.parse(JSON.stringify(boxed)))).toEqual(boxed);
    // Old saved formulas (no marks) stay exactly as they were.
    expect(normalizeRichText([{ type: "math", latex: "x^2" }])).toEqual([{ type: "math", latex: "x^2" }]);
    expect(normalizeRichText([{ type: "math", latex: "x^2", marks: ["sparkle"] }])).toEqual([{ type: "math", latex: "x^2" }]);
  });

  it("puts each line in its own paragraph", () => {
    const doc = richTextToDoc(sample);
    expect(doc.content).toHaveLength(2);
    expect(doc.content?.[0].content?.[1]).toEqual({ type: "math", attrs: { latex: "\\frac{1}{2}" } });
  });

  it("handles an empty value", () => {
    expect(richTextToDoc([])).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
    expect(docToRichText(richTextToDoc([]))).toEqual([]);
  });

  it("drops empty formulas and trailing empty lines", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "x" }, { type: "math", attrs: { latex: "" } }] },
        { type: "paragraph" },
      ],
    };
    expect(docToRichText(doc)).toEqual([{ type: "text", text: "x" }]);
  });
});

describe("normalizeRichText", () => {
  it("turns an old plain-string question into rich text", () => {
    expect(normalizeRichText("2 + 2 = ?")).toEqual([{ type: "text", text: "2 + 2 = ?" }]);
    expect(normalizeRichText("")).toEqual([]);
  });

  it("keeps valid pieces and drops broken ones", () => {
    expect(
      normalizeRichText([{ type: "text", text: "a" }, { type: "math" }, 5, { type: "math", latex: "x^2" }]),
    ).toEqual([{ type: "text", text: "a" }, { type: "math", latex: "x^2" }]);
  });
});

describe("cleanRichText", () => {
  it("joins neighbouring text", () => {
    expect(cleanRichText([{ type: "text", text: "a" }, { type: "text", text: "b" }])).toEqual([
      { type: "text", text: "ab" },
    ]);
  });
});

describe("isRichTextEmpty", () => {
  it("is empty only without text and formulas", () => {
    expect(isRichTextEmpty([])).toBe(true);
    expect(isRichTextEmpty([{ type: "text", text: "  " }])).toBe(true);
    expect(isRichTextEmpty([{ type: "math", latex: "\\pi" }])).toBe(false);
  });
});
