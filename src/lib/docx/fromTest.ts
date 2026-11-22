/**
 * A test → the content of a Word document.
 *
 * Two kinds of questions:
 * - "native": multiple choice, true / false, short answer, open answer and
 *   matching become real Word text — editable, with Word equations.
 * - everything else (diagrams, grids, maps, the special subject types…)
 *   goes in as a sharp PICTURE of that question taken from the print page,
 *   so it looks exactly like the PDF. Without such a picture (no Chrome on
 *   the server) the question's text is kept with a short note.
 */
import { dictionaries, type Language, type MessageKey } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import { matchingAnswers, matchingLeftColumn, matchingRightColumn } from "@/lib/matching";
import type { PaperHeader } from "@/lib/paperHeader";
import { formatPoints, optionLabel, questionNumbers, totalPoints, visibleOptions } from "@/lib/questions";
import { isRichTextEmpty, type RichText } from "@/lib/richText";
import type { Question, Test } from "@/lib/storage/types";
import { georgianTypography } from "@/lib/typography";
import type { Variant } from "@/lib/variants";
import { getToolkit, openAnswerSpace } from "@/subjects/registry";
import { TEXT_WIDTH_MM, type Block, type DocxImage, type Paragraph, type Run } from "./document";
import { chemPieces, latexToOmml } from "./omml";

export type DocxVersion = "student" | "key";

const NATIVE_TYPES = new Set<Question["type"]>(["multiple-choice", "true-false", "short-answer", "open-answer", "matching"]);

/** "data:image/png;base64,…" → the picture's bytes (PNG and JPEG only: Word can't show SVG reliably). */
export function imageFromDataUrl(url: string | undefined, width: number, height: number): DocxImage | null {
  const match = url?.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return { data: new Uint8Array(Buffer.from(match[2], "base64")), type: match[1] as "png" | "jpeg", width, height };
}

/** Rich text → Word runs, or null when a formula in it can't become a real Word equation. */
export function richTextRuns(value: RichText, fix: (text: string) => string = (text) => text, extra: Partial<Extract<Run, { text: string }>> = {}): Run[] | null {
  const runs: Run[] = [];
  for (const segment of value) {
    if (segment.type === "text") {
      const marks = segment.marks ?? [];
      runs.push({ text: fix(segment.text), bold: marks.includes("bold") || extra.bold, italic: marks.includes("italic") || extra.italic, underline: marks.includes("underline"), box: marks.includes("box") });
    } else if (segment.latex.trim().startsWith("\\ce{")) {
      const pieces = chemPieces(segment.latex);
      if (!pieces) return null;
      runs.push(...pieces.map((piece) => ({ text: piece.text, script: piece.script, bold: extra.bold })));
    } else {
      const math = latexToOmml(segment.latex);
      if (!math) return null;
      runs.push({ math });
    }
  }
  return runs;
}

function richTexts(question: Question): RichText[] {
  const all = [question.text];
  if (question.type === "multiple-choice") all.push(...question.options.map((option) => option.text));
  if (question.type === "short-answer") all.push(question.answer);
  if (question.type === "open-answer" && question.answer) all.push(question.answer);
  if (question.type === "matching") all.push(...question.pairs.flatMap((pair) => [pair.left, pair.right]), ...question.extras.map((extra) => extra.text));
  return all;
}

/** True when this question must go into Word as a picture of the printed question. */
export function needsPicture(question: Question, images: Record<string, string>): boolean {
  if (!NATIVE_TYPES.has(question.type) || question.grid) return true;
  // Drawn diagrams, and pictures we can't hand to Word (SVG, or not sent along).
  if (question.images.some((image) => image.diagram || !imageFromDataUrl(images[image.imageId], 1, 1))) return true;
  return richTexts(question).some((value) => richTextRuns(value) === null);
}

/** Pictures of printed questions, by "<variant>/<version>/<print block key>" (made by the server's Chrome). */
export type BlockPictures = Record<string, DocxImage>;
export const pictureKey = (variant: string, version: DocxVersion, blockKey: string) => `${variant}/${version}/${blockKey}`;

export type DocxInput = {
  variants: Variant[];
  /** Print "Variant B" on each paper (the test has more than one variant). */
  showVariant: boolean;
  version: DocxVersion;
  /** The language of the paper's own words ("Answer:", "Points"…). */
  language: Language;
  /** The teacher's uploaded pictures as data URLs, by picture id. */
  images: Record<string, string>;
  pictures: BlockPictures;
  /** The teacher's own paper header (Premium), or null. */
  header: PaperHeader | null;
  /** The print blocks of a question, in order (features/print/blocks.ts) — given by the caller to keep this file free of React. */
  blockKeys: (questions: Question[], version: DocxVersion) => Map<string, string[]>;
};

const p = (runs: Run[], extra: Partial<Paragraph> = {}): Paragraph => ({ kind: "p", runs, ...extra });
const GAP = "    ";
const blank = (length: number) => "_".repeat(length);

export function testToBlocks(input: DocxInput): Block[] {
  const blocks: Block[] = [];
  input.variants.forEach((variant, index) => {
    const part = variantBlocks(variant, input);
    if (index > 0 && part[0]?.kind === "p") part[0] = { ...part[0], pageBreakBefore: true };
    blocks.push(...part);
  });
  return blocks;
}

function variantBlocks(variant: Variant, input: DocxInput): Block[] {
  const { version, language, images, pictures, header } = input;
  const test = variant.test;
  const toolkit = getToolkit(test.subjectId);
  const paperLanguage: Language = toolkit.print.language ?? language;
  const t = (key: MessageKey, values: Record<string, string | number> = {}) =>
    dictionaries[paperLanguage][key].replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
  const fix = toolkit.print.typography === "georgian" ? georgianTypography : (text: string) => text;
  const key = version === "key";
  const blocks: Block[] = [];

  // ---- The paper's header ----
  if (input.showVariant) blocks.push(p([{ text: t("variants.name", { label: variant.label }), bold: true }], { align: "right", after: 0 }));
  if (key) blocks.push(p([{ text: t("print.keyBanner"), bold: true }], { align: "center" }));
  const logo = header?.logoImageId ? imageFromDataUrl(images[header.logoImageId], header.logoWidth, header.logoHeight) : null;
  if (logo) {
    // At most 22 mm tall on paper, like the printed letterhead.
    const scale = Math.min(1, 83 / Math.max(1, logo.height), 260 / Math.max(1, logo.width));
    blocks.push(p([{ image: { ...logo, width: logo.width * scale, height: logo.height * scale } }], { align: header?.logoPosition === "left" ? undefined : header?.logoPosition, after: 2 }));
  }
  const school = header?.schoolName || test.schoolName;
  if (school) blocks.push(p([{ text: fix(school) }], { align: "center", after: 0 }));
  for (const line of header?.extraLines ?? []) if (line.trim()) blocks.push(p([{ text: fix(line) }], { align: "center", after: 0 }));
  blocks.push(p([{ text: fix(test.title) || t("test.untitled"), bold: true, size: 16 }], { align: "center", before: 4, after: 2 }));
  const meta = [test.subject, test.level && t("print.level", { level: test.level }), test.grade, formatDate(test.date, paperLanguage), test.timeLimitMinutes ? t("print.time", { minutes: test.timeLimitMinutes }) : ""].filter(Boolean);
  if (meta.length) blocks.push(p([{ text: meta.join("  ·  "), grey: true }], { align: "center" }));
  const total = formatPoints(totalPoints(test.questions));
  blocks.push(
    key
      ? p([{ text: t("print.total", { points: total }), bold: true }], { before: 6, after: 8 })
      : p([{ text: `${t("print.studentName")}: ${blank(34)}${GAP}${t("print.class")}: ${blank(6)}${GAP}${t("print.score")}: ${blank(4)} / ${total}` }], { before: 6, after: 8 }),
  );
  if (!isRichTextEmpty(test.instructions)) {
    // A formula Word can't show (rare) → the instructions as plain text, formulas as typed.
    const plain = test.instructions.map((segment) => (segment.type === "text" ? fix(segment.text) : segment.latex)).join("");
    blocks.push(p(richTextRuns(test.instructions, fix, { italic: true }) ?? [{ text: plain, italic: true }], { after: 8 }));
  }

  // ---- The questions ----
  const numbers = questionNumbers(test.questions);
  const keysOf = input.blockKeys(test.questions, version);
  for (const question of test.questions) {
    const number = numbers.get(question.id) ?? null;
    if (!needsPicture(question, images)) {
      blocks.push(...nativeQuestion(question, number, test, key, t, fix, images));
      continue;
    }
    const shots = (keysOf.get(question.id) ?? []).map((blockKey) => pictures[pictureKey(variant.label, version, blockKey)]).filter((shot) => shot !== undefined);
    if (shots.length > 0) {
      shots.forEach((image, i) => blocks.push(p([{ image }], { before: i === 0 ? 8 : 0, after: 0 })));
    } else {
      // No picture could be made: keep the words, and say plainly what is missing.
      const words = question.text.map((segment) => (segment.type === "text" ? segment.text : segment.latex)).join("");
      blocks.push(p([...(number === null ? [] : [{ text: `${number}. `, bold: true }]), { text: fix(words) }], { before: 8, indent: 8, hanging: 8 }));
      blocks.push(p([{ text: t("docx.notConverted"), italic: true, grey: true }], { indent: 8 }));
    }
  }
  return blocks;
}

function nativeQuestion(
  question: Question,
  number: number | null,
  test: Test,
  key: boolean,
  t: (key: MessageKey, values?: Record<string, string | number>) => string,
  fix: (text: string) => string,
  images: Record<string, string>,
): Block[] {
  const INDENT = 8; // mm: the text starts after the number
  const blocks: Block[] = [];
  const runs = (value: RichText, extra?: Partial<Extract<Run, { text: string }>>) => richTextRuns(value, fix, extra) ?? [];

  // Pictures first (as on paper when placed above; Word has no simple "to the right of the text").
  for (const image of question.images) {
    const picture = imageFromDataUrl(images[image.imageId], image.width, image.height);
    if (!picture) continue;
    const width = ((TEXT_WIDTH_MM - INDENT) * (image.widthPercent / 100) * 96) / 25.4;
    blocks.push(p([{ image: { ...picture, width, height: (width * image.height) / Math.max(1, image.width) } }], { indent: INDENT, before: 8, after: 2, keepNext: true }));
    if (image.caption) blocks.push(p([{ text: fix(image.caption), italic: true, size: 9.5 }], { indent: INDENT, keepNext: true }));
  }

  const points = formatPoints(question.points);
  const head: Run[] = [...(number === null ? [] : [{ text: `${number}. `, bold: true } as Run]), ...runs(question.text)];
  if (test.printOptions.showPoints) head.push({ tab: true }, { text: `(${t(question.points === 1 ? "print.pointsOne" : "print.pointsMany", { points })})`, grey: true, size: 9.5 });
  blocks.push(p(head, { before: question.images.length ? 0 : 8, indent: INDENT, hanging: INDENT, keepNext: true, rightTab: true }));
  if (question.instructionKa && test.printOptions.bilingual) blocks.push(p([{ text: question.instructionKa, italic: true, grey: true }], { indent: INDENT, keepNext: true }));

  switch (question.type) {
    case "multiple-choice":
      visibleOptions(question).forEach((option, index) => {
        const correct = key && option.id === question.correctOptionId;
        blocks.push(p([{ text: `${optionLabel(index, test.labelStyle)}) `, bold: correct }, ...runs(option.text, { bold: correct }), ...(correct ? [{ text: "  ✓", bold: true } as Run] : [])], { indent: INDENT + 7, hanging: 7, after: 2 }));
      });
      break;
    case "true-false": {
      const choices: (boolean | "not-given")[] = question.notGiven ? [true, false, "not-given"] : [true, false];
      const line: Run[] = [];
      for (const value of choices) {
        const correct = key && question.correct === value;
        line.push({ text: `${correct ? "●" : "○"} ${t(value === "not-given" ? "tf.notGiven" : value ? "tf.true" : "tf.false")}${GAP}${GAP}`, bold: correct });
      }
      blocks.push(p(line, { indent: INDENT }));
      break;
    }
    case "short-answer": {
      const answer = key && !isRichTextEmpty(question.answer) ? runs(question.answer, { bold: true }) : null;
      blocks.push(p([{ text: `${t("print.answer")} ` }, ...(answer ?? [{ text: blank(40) }])], { indent: INDENT, before: 4 }));
      break;
    }
    case "open-answer": {
      const space = openAnswerSpace(question, test.subjectId);
      const answer = key && question.answer && !isRichTextEmpty(question.answer) ? runs(question.answer, { bold: true }) : null;
      // "One line": like a short answer.
      if (space === "short") {
        blocks.push(p([{ text: `${t("print.answer")} ` }, ...(answer ?? [{ text: blank(40) }])], { indent: INDENT, before: 4 }));
        break;
      }
      // "Blank" (the default in mathematics): the same room, without lines.
      for (let i = 0; i < question.lines; i++) blocks.push(p([], { indent: INDENT, line: space === "lines", before: 10, after: 0 }));
      if (answer) blocks.push(p([{ text: `${t("print.answer")} ` }, ...answer], { indent: INDENT, before: 4 }));
      break;
    }
    case "matching": {
      const left = matchingLeftColumn(question);
      const right = matchingRightColumn(question);
      const half = (TEXT_WIDTH_MM - INDENT) / 2;
      const rows: Paragraph[][][] = [];
      if (question.leftTitle || question.rightTitle) rows.push([[p([{ text: fix(question.leftTitle), bold: true }])], [p([{ text: fix(question.rightTitle), bold: true }])]]);
      for (let i = 0; i < Math.max(left.length, right.length); i++) {
        rows.push([
          left[i] ? [p([{ text: `${i + 1}. ` }, ...runs(left[i].left)], { after: 2 })] : [],
          right[i] ? [p([{ text: `${optionLabel(i, test.labelStyle)}) ` }, ...runs(right[i].text)], { after: 2 })] : [],
        ]);
      }
      // The table sits after the number's indent thanks to an empty first column.
      blocks.push({ kind: "table", widths: [INDENT, half, half], rows: rows.map((row) => [[], ...row]) });
      const answers = matchingAnswers(question, test.labelStyle);
      const boxes = left.map((_, i) => `${i + 1}–${key ? answers[i] : blank(3)}`).join(GAP);
      blocks.push(p([{ text: `${t("print.answer")} ` }, { text: boxes, bold: key }], { indent: INDENT, before: 4 }));
      break;
    }
    default:
      break;
  }
  return blocks;
}
