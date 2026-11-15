// @vitest-environment node
/** The Word export: the generated file is opened again and its structure checked. */
import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { printBlocks } from "@/features/print/blocks";
import { createQuestion } from "@/lib/questions";
import { richTextFromString, type RichText } from "@/lib/richText";
import { normalizeTest } from "@/lib/storage/migrate";
import type { Question, Test } from "@/lib/storage/types";
import { buildVariants } from "@/lib/variants";
import { sampleFor } from "@/samples";
import { SUBJECT_IDS } from "@/subjects/ids";
import { buildDocx } from "./document";
import { needsPicture, pictureKey, richTextRuns, testToBlocks, type BlockPictures, type DocxVersion } from "./fromTest";
import { chemPieces, latexToOmml, mathMlToOmml, parseXml } from "./omml";
import { unzip, zip } from "./zip";

const text = (bytes: Uint8Array | undefined) => new TextDecoder().decode(bytes);
/** Every XML part must be well-formed (our small reader refuses anything else). */
const wellFormed = (xml: string) => parseXml(xml.replace(/^<\?xml[^>]*\?>\s*/, "")) !== null;
const blockKeys = (questions: Question[], version: DocxVersion) => {
  const keys = new Map<string, string[]>();
  for (const block of printBlocks(questions, version)) keys.set(block.question.id, [...(keys.get(block.question.id) ?? []), block.key]);
  return keys;
};
/** A 1 × 1 PNG. */
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
const math = (latex: string): RichText => [{ type: "math", latex }];

function sampleTest(): Test {
  const mc = createQuestion("multiple-choice");
  if (mc.type !== "multiple-choice") throw new Error();
  mc.text = [{ type: "text", text: "ამოხსენით: " }, { type: "math", latex: "x^2=\\frac{9}{4}" }];
  mc.options = [{ id: "o1", text: math("\\frac{3}{2}") }, { id: "o2", text: richTextFromString("არც ერთი") }];
  mc.correctOptionId = "o1";
  const tf = createQuestion("true-false");
  if (tf.type !== "true-false") throw new Error();
  tf.text = [{ type: "text", text: "წყლის ფორმულაა " }, { type: "math", latex: "\\ce{H2O}" }, { type: "text", text: " — „სწორია“?", marks: ["bold"] }];
  tf.correct = true;
  const short = createQuestion("short-answer");
  if (short.type !== "short-answer") throw new Error();
  short.text = richTextFromString("რამდენია 2 + 2?");
  short.answer = math("\\sqrt{16}");
  const open = createQuestion("open-answer");
  if (open.type !== "open-answer") throw new Error();
  open.text = richTextFromString("ახსენით.");
  open.lines = 3;
  open.images = [{ id: "pl", imageId: "pic", width: 200, height: 100, widthPercent: 50, position: "above", caption: "სურ. 1" }];
  const matching = createQuestion("matching");
  if (matching.type !== "matching") throw new Error();
  matching.text = richTextFromString("დააკავშირეთ.");
  matching.pairs = [{ id: "p1", left: richTextFromString("დავით აღმაშენებელი"), right: richTextFromString("1121") }, { id: "p2", left: richTextFromString("თამარ მეფე"), right: richTextFromString("1184") }];
  const special = { ...createQuestion("open-answer"), text: richTextFromString("დახაზეთ გრაფიკი."), grid: { kind: "squares" as const, cols: 10, rows: 5 } };
  const test = normalizeTest({ id: "t1", title: "ალგებრა & <გეომეტრია>", subjectId: "math", subject: "მათემატიკა", grade: "9", schoolName: "სკოლა", instructions: "წაიკითხეთ ყურადღებით.", questions: [mc, tf, short, open, matching, special], variants: { count: 2, shuffleQuestions: true, shuffleOptions: true, seed: 7 } });
  if (!test) throw new Error("bad test");
  return test;
}

function make(version: DocxVersion, pictures: (test: Test) => BlockPictures = () => ({}), all = false) {
  const test = sampleTest();
  const variants = buildVariants(test);
  const shown = all ? variants : [variants[0]];
  const blocks = testToBlocks({ variants: shown, showVariant: true, version, language: "ka", images: { pic: PNG }, pictures: pictures(test), header: null, blockKeys });
  const file = buildDocx({ title: test.title, blocks });
  const parts = unzip(file);
  return { test, file, parts, document: text(parts.get("word/document.xml")) };
}

describe("zip", () => {
  it("writes an archive that reads back byte for byte (compressed text, stored pictures)", () => {
    const files = [{ name: "a/ქართული.xml", data: new TextEncoder().encode("<x>" + "გამარჯობა ".repeat(500) + "</x>") }, { name: "word/media/image1.png", data: new Uint8Array([1, 2, 3, 250]) }];
    const archive = zip(files);
    expect(archive.length).toBeLessThan(2000); // really compressed
    const back = unzip(archive);
    expect([...back.keys()]).toEqual(files.map((file) => file.name));
    for (const file of files) expect(back.get(file.name)).toEqual(file.data);
    expect(text(archive.subarray(0, 2))).toBe("PK");
  });
});

describe("formulas as Word equations", () => {
  it("converts school formulas to OMML", () => {
    expect(latexToOmml("\\frac{1}{2}")).toContain("<m:f><m:num>");
    expect(latexToOmml("x^2")).toMatch(/<m:sSup><m:e>.*x.*<\/m:e><m:sup>.*2.*<\/m:sup><\/m:sSup>/);
    expect(latexToOmml("a_1^2")).toContain("<m:sSubSup>");
    expect(latexToOmml("\\sqrt{y}")).toContain('<m:degHide m:val="1"/>');
    expect(latexToOmml("\\sqrt[3]{8}")).toMatch(/<m:rad><m:deg>.*3.*<\/m:deg><m:e>.*8.*<\/m:e><\/m:rad>/);
    expect(latexToOmml("\\left(\\frac{a}{b}\\right)^{2}")).toContain('<m:begChr m:val="("/><m:endChr m:val=")"/>');
    expect(latexToOmml("\\lim_{x\\to0}\\frac{\\sin x}{x}")).toContain("<m:limLow>");
    expect(latexToOmml("\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}")).toMatch(/<m:m>(<m:mr>(<m:e>.*?<\/m:e>){2}<\/m:mr>){2}<\/m:m>/);
    expect(latexToOmml("\\vec{F}")).toContain("<m:acc>");
    // Georgian school names of functions stay upright, like sin.
    expect(latexToOmml("\\operatorname{tg}\\alpha")).toContain('<m:sty m:val="p"/>');
    expect(latexToOmml("\\text{მ/წმ}")).toContain("მ/წმ");
    expect(latexToOmml("x\\in[1;5)")).toContain(";");
    // Invisible "function application" marks are dropped, not printed as boxes.
    expect(latexToOmml("\\int_0^1 x\\,dx")).not.toMatch(/[\u2061-\u2064]/);
  });

  it("every produced equation is well-formed XML, and special characters are escaped", () => {
    for (const latex of ["x<5", "a\\&b", "x^2+\\frac{1}{2}=\\sqrt{y}", "\\sum_{i=1}^{n} i^2", "5\\cdot10^{3}", "\\binom{n}{k}", "|x|", "\\log_2 8"]) {
      const omml = latexToOmml(latex);
      expect(omml, latex).not.toBeNull();
      expect(wellFormed(omml!), latex).toBe(true);
    }
    expect(latexToOmml("x<5")).toContain("&lt;");
  });

  it("answers null (→ a picture is used) for what it can't do faithfully", () => {
    expect(latexToOmml("")).toBeNull();
    expect(latexToOmml("\\placeholder{}")).toBeNull();
    expect(latexToOmml("\\ce{H2O}")).toBeNull(); // chemistry has its own road (chemPieces)
    expect(mathMlToOmml("<mrow><mfoo>1</mfoo></mrow>")).toBeNull();
    expect(mathMlToOmml("<mrow><mi>x</mrow>")).toBeNull();
    expect(mathMlToOmml("?")).toBeNull();
  });

  it("chemistry becomes text with small numbers below and charges above", () => {
    expect(chemPieces("\\ce{H2SO4}")).toEqual([{ text: "H" }, { text: "2", script: "sub" }, { text: "SO" }, { text: "4", script: "sub" }]);
    expect(chemPieces("\\ce{2H2 + O2 -> 2H2O}")?.map((piece) => piece.text).join("")).toBe("2H2 + O2 → 2H2O");
    expect(chemPieces("\\ce{2H2 + O2 -> 2H2O}")?.[0]).toEqual({ text: "2H" }); // a coefficient stays big
    expect(chemPieces("\\ce{Fe^3+}")).toEqual([{ text: "Fe" }, { text: "3+", script: "sup" }]);
    expect(chemPieces("\\ce{Ca(OH)2}")?.at(-1)).toEqual({ text: "2", script: "sub" });
    expect(chemPieces("\\ce{N2 + 3H2 <=> 2NH3}")?.map((piece) => piece.text).join("")).toContain("⇌");
    expect(chemPieces("\\ce{A ->[t] B}")).toBeNull(); // conditions over the arrow: a picture
    expect(chemPieces("x^2")).toBeNull();
  });
});

describe("the Word file", () => {
  it("is a valid package: the parts Word needs, well-formed XML, A4, a Georgian-capable font", () => {
    const { parts, document, file } = make("student");
    expect([...parts.keys()].slice(0, 6)).toEqual(["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/styles.xml", "word/_rels/document.xml.rels", "docProps/core.xml"]);
    for (const [name, data] of parts) if (name.endsWith(".xml") || name.endsWith(".rels")) expect(wellFormed(text(data)), name).toBe(true);
    expect(document).toContain('<w:pgSz w:w="11906" w:h="16838"/>'); // A4 in twentieths of a point
    expect(text(parts.get("word/styles.xml"))).toContain('w:ascii="Sylfaen"');
    expect(text(parts.get("word/styles.xml"))).toContain('w:lang w:val="ka-GE"');
    expect(text(parts.get("docProps/core.xml"))).toContain("ალგებრა &amp; &lt;გეომეტრია&gt;");
    // Every picture in the text has its file and its relationship.
    const used = [...document.matchAll(/r:embed="(rImg\d+)"/g)].map((match) => match[1]);
    const rels = text(parts.get("word/_rels/document.xml.rels"));
    for (const id of used) expect(rels).toContain(`Id="${id}"`);
    expect(parts.has("word/media/image1.png")).toBe(true);
    expect(text(parts.get("[Content_Types].xml"))).toContain('Extension="png"');
    // Handy for looking at the result by hand (Word, Pages, LibreOffice).
    if (process.env.DOCX_OUT) {
      mkdirSync(process.env.DOCX_OUT, { recursive: true });
      writeFileSync(`${process.env.DOCX_OUT}/student.docx`, file);
      writeFileSync(`${process.env.DOCX_OUT}/key-all.docx`, make("key", undefined, true).file);
    }
  });

  it("student paper: header, numbered questions, real equations, options, lines, the matching table — and no answers", () => {
    const { document } = make("student");
    expect(document).toContain("ვარიანტი A");
    expect(document).toContain("ალგებრა &amp; &lt;გეომეტრია&gt;");
    expect(document).toContain("წაიკითხეთ ყურადღებით.");
    expect(document).toContain("სახელი, გვარი");
    expect(document).toMatch(/<w:t xml:space="preserve">1\.\u00a0<\/w:t>/);
    expect(document).toContain("<m:oMath>");
    expect(document).toContain("<m:f><m:num>"); // the fraction is an equation, not a picture
    expect(document).toContain('<w:vertAlign w:val="subscript"/>'); // H₂O
    expect(document).toContain("<w:b/>"); // bold text mark kept
    expect((document.match(/<w:pBdr>/g) ?? []).length).toBe(3); // three writing lines
    expect(document).toContain("<w:tbl>");
    expect(document).toContain("სურ. 1");
    expect(document).not.toContain("✓");
    expect(document).not.toContain("●");
    expect(document).not.toContain("პასუხები — მხოლოდ მასწავლებლისთვის");
    // The question with a grid has no picture here (no Chrome in this test): its words are kept, with a note.
    expect(document).toContain("დახაზეთ გრაფიკი.");
    expect(document).toContain("Word-ში ვერ გადავიდა");
  });

  it("answer key: the banner, the right option, the right circle, the short answer and the matching letters", () => {
    const { document, test } = make("key");
    expect(document).toContain("პასუხები — მხოლოდ მასწავლებლისთვის");
    expect(document).toContain("✓");
    expect(document).toContain("● სწორია");
    expect(document).toContain("○ მცდარია");
    expect(document).toContain("<m:rad>"); // √16 as the short answer
    // Matching: the letters match the shuffled right column of THIS variant.
    const matching = buildVariants(test)[0].test.questions.find((q) => q.type === "matching");
    if (matching?.type !== "matching") throw new Error();
    const letters = ["ა", "ბ"];
    const expected = matching.pairs.map((pair, i) => `${i + 1}–${letters[matching.shownOrder!.indexOf(pair.id)]}`);
    for (const answer of expected) expect(document).toContain(answer);
  });

  it("all variants: each starts on a new page with its own label", () => {
    const { document } = make("student", undefined, true);
    expect(document).toContain("ვარიანტი A");
    expect(document).toContain("ვარიანტი B");
    expect((document.match(/<w:pageBreakBefore\/>/g) ?? []).length).toBe(1);
  });

  it("questions Word can't hold as text go in as the pictures handed over (every print block of the question)", () => {
    const shot = { data: new Uint8Array([137, 80, 78, 71]), type: "png" as const, width: 600, height: 120 };
    const { document, parts } = make("student", (test) => {
      const special = test.questions.find((q) => q.grid)!;
      return { [pictureKey("A", "student", special.id)]: shot };
    });
    expect(document).not.toContain("Word-ში ვერ გადავიდა");
    expect(document).not.toContain("დახაზეთ გრაფიკი."); // it is inside the picture now
    expect(parts.get("word/media/image2.png")).toEqual(shot.data);
    expect(document).toContain(`cx="${600 * 9525}"`);
  });

  it("decides per question: text when possible, a picture for diagrams, grids, special types and unknown formulas", () => {
    const plain = { ...createQuestion("short-answer"), text: richTextFromString("x") } as Question;
    expect(needsPicture(plain, {})).toBe(false);
    expect(needsPicture({ ...plain, text: math("\\placeholder{}") }, {})).toBe(true);
    expect(needsPicture({ ...plain, grid: { kind: "squares", cols: 5, rows: 5 } }, {})).toBe(true);
    expect(needsPicture(createQuestion("order"), {})).toBe(true);
    const withPicture = { ...plain, images: [{ id: "a", imageId: "pic", width: 10, height: 10, widthPercent: 50, position: "above" as const, caption: "" }] };
    expect(needsPicture(withPicture, { pic: PNG })).toBe(false);
    expect(needsPicture(withPicture, {})).toBe(true); // the picture wasn't sent along
    expect(needsPicture(withPicture, { pic: "data:image/svg+xml;base64,AAAA" })).toBe(true);
    expect(richTextRuns([{ type: "text", text: "a", marks: ["italic", "box"] }])).toEqual([{ text: "a", bold: undefined, italic: true, underline: false, box: true }]);
  });

  it("every sample test of every subject becomes a valid Word file (student and key)", () => {
    for (const sample of SUBJECT_IDS.map(sampleFor)) {
      for (const version of ["student", "key"] as const) {
        const variants = buildVariants(sample);
        const blocks = testToBlocks({ variants, showVariant: variants.length > 1, version, language: "ka", images: {}, pictures: {}, header: null, blockKeys });
        const parts = unzip(buildDocx({ title: sample.title, blocks }));
        expect(wellFormed(text(parts.get("word/document.xml"))), `${sample.id} ${version}`).toBe(true);
      }
    }
  });
});
