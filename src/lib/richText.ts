/**
 * "Rich text": normal text mixed with math formulas.
 *
 * We store it as a simple list of pieces ("segments"):
 *
 *   [ { type: "text", text: "იპოვეთ " },
 *     { type: "math", latex: "\\frac{1}{2}" },
 *     { type: "text", text: " ის მნიშვნელობა" } ]
 *
 * A formula is saved as LaTeX — the standard way to write math as text.
 * Teachers never see LaTeX; MathLive turns it into real formulas.
 *
 * Line breaks are "\n" inside text segments. This is OUR format, not the
 * editor library's, so we could swap the editor later without touching
 * saved tests.
 */

export type RichTextSegment =
  | { type: "text"; text: string }
  | { type: "math"; latex: string };

export type RichText = RichTextSegment[];

export const emptyRichText = (): RichText => [];

export function richTextFromString(text: string): RichText {
  return text ? [{ type: "text", text }] : [];
}

/** True when there is no text (only spaces) and no formula. */
export function isRichTextEmpty(value: RichText): boolean {
  return value.every((s) => (s.type === "text" ? s.text.trim() === "" : s.latex.trim() === ""));
}

/** Joins neighbouring text pieces and drops empty ones. */
export function cleanRichText(value: RichText): RichText {
  const result: RichText = [];
  for (const segment of value) {
    if (segment.type === "text") {
      if (!segment.text) continue;
      const last = result[result.length - 1];
      if (last?.type === "text") {
        result[result.length - 1] = { type: "text", text: last.text + segment.text };
        continue;
      }
    } else if (!segment.latex.trim()) {
      continue; // an empty formula box isn't worth saving
    }
    result.push(segment);
  }
  return result;
}

/**
 * Accepts anything read from storage and returns valid rich text.
 * Old tests stored question text as a plain string — that becomes one text piece.
 */
export function normalizeRichText(raw: unknown): RichText {
  if (typeof raw === "string") return richTextFromString(raw);
  if (!Array.isArray(raw)) return [];
  const segments: RichText = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const s = item as Record<string, unknown>;
    if (s.type === "text" && typeof s.text === "string") segments.push({ type: "text", text: s.text });
    if (s.type === "math" && typeof s.latex === "string") segments.push({ type: "math", latex: s.latex });
  }
  return cleanRichText(segments);
}

// ---------------------------------------------------------------------------
// Conversion to / from the editor's document format (TipTap / ProseMirror).
// A document is a list of paragraphs; each paragraph holds text and formulas.
// ---------------------------------------------------------------------------

type DocNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
};

export function richTextToDoc(value: RichText): DocNode {
  const paragraphs: DocNode[][] = [[]];
  for (const segment of value) {
    if (segment.type === "math") {
      paragraphs[paragraphs.length - 1].push({ type: "math", attrs: { latex: segment.latex } });
      continue;
    }
    segment.text.split("\n").forEach((line, i) => {
      if (i > 0) paragraphs.push([]); // each "\n" starts a new paragraph
      if (line) paragraphs[paragraphs.length - 1].push({ type: "text", text: line });
    });
  }
  return {
    type: "doc",
    content: paragraphs.map((content) =>
      content.length ? { type: "paragraph", content } : { type: "paragraph" },
    ),
  };
}

export function docToRichText(doc: DocNode): RichText {
  const segments: RichText = [];
  (doc.content ?? []).forEach((paragraph, i) => {
    if (i > 0) segments.push({ type: "text", text: "\n" });
    for (const node of paragraph.content ?? []) {
      if (node.type === "text" && node.text) segments.push({ type: "text", text: node.text });
      if (node.type === "math") segments.push({ type: "math", latex: String(node.attrs?.latex ?? "") });
    }
  });
  // Remove line breaks at the very end (empty last paragraphs).
  const cleaned = cleanRichText(segments);
  const last = cleaned[cleaned.length - 1];
  if (last?.type === "text") {
    const trimmed = last.text.replace(/\n+$/, "");
    if (trimmed) cleaned[cleaned.length - 1] = { type: "text", text: trimmed };
    else cleaned.pop();
  }
  return cleaned;
}
