/**
 * Formulas for Word. Our formulas are stored as LaTeX; Word's own equation
 * format is "OMML" (Office Math Markup Language). The road between them:
 *
 *   LaTeX  →  MathML (MathLive already knows how)  →  OMML (this file)
 *
 * So a fraction typed in Rapido opens in Word as a real, editable Word
 * equation. Anything this converter doesn't know returns null, and the
 * caller then uses a picture of the question instead — never a broken formula.
 */
import { convertLatexToMathMl } from "mathlive";
import { chemSource } from "@/lib/chem";

// ---- A tiny XML reader (MathLive's MathML is simple and well-formed) ----

export type XmlNode = { tag: string; attrs: Record<string, string>; children: XmlNode[]; text: string };

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : whole;
    }
    return NAMED[code] ?? whole;
  });
}

/** Parses a fragment like "<mrow><mi>x</mi></mrow>". Returns null when it isn't well-formed. */
export function parseXml(source: string): XmlNode | null {
  const root: XmlNode = { tag: "#root", attrs: {}, children: [], text: "" };
  const stack = [root];
  const pattern = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+\s*=\s*"[^"]*")*)\s*(\/?)>|([^<]+)/g;
  let consumed = 0;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    if (match.index !== consumed) return null; // something unreadable in between
    consumed = pattern.lastIndex;
    const top = stack[stack.length - 1];
    if (match[5] !== undefined) {
      top.text += decodeEntities(match[5]);
    } else if (match[1]) {
      if (stack.length < 2 || top.tag !== match[2]) return null;
      stack.pop();
    } else {
      const attrs: Record<string, string> = {};
      for (const attr of match[3].matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) attrs[attr[1]] = decodeEntities(attr[2]);
      const node: XmlNode = { tag: match[2], attrs, children: [], text: "" };
      top.children.push(node);
      if (!match[4]) stack.push(node);
    }
  }
  return consumed === source.length && stack.length === 1 ? root : null;
}

export const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- MathML → OMML ----

class Unsupported extends Error {}

const MATH_FONT = '<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr>';
/** Characters MathML uses for "nothing visible": function application, invisible times / separator / plus. */
const INVISIBLE = /[⁡-⁤]/g;

function run(text: string, style: "" | "plain" | "normal-text" = ""): string {
  const clean = text.replace(INVISIBLE, "");
  if (!clean) return "";
  const props = style === "plain" ? '<m:rPr><m:sty m:val="p"/></m:rPr>' : style === "normal-text" ? "<m:rPr><m:nor/></m:rPr>" : "";
  return `<m:r>${props}${MATH_FONT}<m:t xml:space="preserve">${escapeXml(clean)}</m:t></m:r>`;
}

const all = (nodes: XmlNode[]) => nodes.map(convert).join("");
const part = (name: string, node: XmlNode | undefined) => `<m:${name}>${node ? convert(node) : ""}</m:${name}>`;
const BRACKETS = new Set(["(", ")", "[", "]", "{", "}", "|", "‖", "⟨", "⟩", "⌊", "⌋", "⌈", "⌉", "∣"]);
const isBracket = (node: XmlNode | undefined) => node?.tag === "mo" && node.children.length === 0 && BRACKETS.has(node.text.trim());

function convert(node: XmlNode): string {
  const kids = node.children;
  switch (node.tag) {
    case "#root":
    case "math":
    case "mstyle":
    case "mpadded":
    case "semantics":
      return all(node.tag === "semantics" ? kids.slice(0, 1) : kids);
    case "mrow": {
      // ( … ) written with \left \right: Word's stretchy brackets.
      if (kids.length >= 3 && isBracket(kids[0]) && isBracket(kids[kids.length - 1])) {
        const open = escapeXml(kids[0].text.trim().replace("∣", "|"));
        const close = escapeXml(kids[kids.length - 1].text.trim().replace("∣", "|"));
        return `<m:d><m:dPr><m:begChr m:val="${open}"/><m:endChr m:val="${close}"/></m:dPr><m:e>${all(kids.slice(1, -1))}</m:e></m:d>`;
      }
      return all(kids);
    }
    case "mi":
      // One letter = a variable (italic); several letters or "normal" = a name like sin, tg (upright).
      return run(node.text, node.attrs.mathvariant === "normal" || [...node.text.trim()].length > 1 ? "plain" : "");
    case "mn":
      return run(node.text);
    case "mo":
      return run(node.text, /^[a-zA-Z]{2,}$/.test(node.text.trim()) ? "plain" : "");
    case "mtext":
    case "ms":
      return run(node.text, "normal-text");
    case "mspace":
      return run(" ", "normal-text");
    case "mphantom":
      return "";
    case "mfrac": {
      if (kids.length !== 2) throw new Unsupported();
      const bar = node.attrs.linethickness === "0" ? '<m:fPr><m:type m:val="noBar"/></m:fPr>' : "";
      return `<m:f>${bar}${part("num", kids[0])}${part("den", kids[1])}</m:f>`;
    }
    case "msup":
      if (kids.length !== 2) throw new Unsupported();
      return `<m:sSup>${part("e", kids[0])}${part("sup", kids[1])}</m:sSup>`;
    case "msub":
      if (kids.length !== 2) throw new Unsupported();
      return `<m:sSub>${part("e", kids[0])}${part("sub", kids[1])}</m:sSub>`;
    case "msubsup":
      if (kids.length !== 3) throw new Unsupported();
      return `<m:sSubSup>${part("e", kids[0])}${part("sub", kids[1])}${part("sup", kids[2])}</m:sSubSup>`;
    case "msqrt":
      return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${all(kids)}</m:e></m:rad>`;
    case "mroot":
      if (kids.length !== 2) throw new Unsupported();
      return `<m:rad>${part("deg", kids[1])}${part("e", kids[0])}</m:rad>`;
    case "munder":
      if (kids.length !== 2) throw new Unsupported();
      return `<m:limLow>${part("e", kids[0])}${part("lim", kids[1])}</m:limLow>`;
    case "mover": {
      if (kids.length !== 2) throw new Unsupported();
      const mark = kids[1].children.length === 0 ? kids[1].text.trim() : "";
      if (mark === "⃗" || mark === "→") return `<m:acc><m:accPr><m:chr m:val="⃗"/></m:accPr>${part("e", kids[0])}</m:acc>`;
      if (mark === "^" || mark === "̂") return `<m:acc>${part("e", kids[0])}</m:acc>`;
      if (mark === "¯" || mark === "‾" || mark === "―" || mark === "̅") return `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr>${part("e", kids[0])}</m:bar>`;
      return `<m:limUpp>${part("e", kids[0])}${part("lim", kids[1])}</m:limUpp>`;
    }
    case "munderover":
      if (kids.length !== 3) throw new Unsupported();
      return `<m:limUpp><m:e><m:limLow>${part("e", kids[0])}${part("lim", kids[1])}</m:limLow></m:e>${part("lim", kids[2])}</m:limUpp>`;
    case "mtable": {
      const rows = kids.filter((row) => row.tag === "mtr");
      if (rows.length === 0) throw new Unsupported();
      // A cell is normally <mtd>; MathLive's \binom puts the content straight into the row.
      const cells = (row: XmlNode) => (row.children.every((cell) => cell.tag === "mtd") ? row.children.map((cell) => all(cell.children)) : [all(row.children)]);
      return `<m:m>${rows.map((row) => `<m:mr>${cells(row).map((cell) => `<m:e>${cell}</m:e>`).join("")}</m:mr>`).join("")}</m:m>`;
    }
    case "menclose":
      return `<m:borderBox><m:e>${all(kids)}</m:e></m:borderBox>`;
    default:
      throw new Unsupported();
  }
}

/** MathML (without the outer <math>) → the inside of a Word equation, or null. */
export function mathMlToOmml(mathMl: string): string | null {
  if (!mathMl.includes("<") || /<merror/.test(mathMl)) return null;
  const tree = parseXml(mathMl.trim());
  if (!tree) return null;
  try {
    const omml = convert(tree);
    return omml || null;
  } catch {
    return null;
  }
}

const cache = new Map<string, string | null>();

/** LaTeX → a Word equation ("<m:oMath>…</m:oMath>"), or null when it can't be done faithfully. */
export function latexToOmml(latex: string): string | null {
  const source = latex.trim();
  if (!source) return null;
  if (!cache.has(source)) {
    let inner: string | null = null;
    // Empty slots ("\placeholder") and unfinished formulas would print as "?" or gaps: not faithful.
    if (!/\\placeholder|\\ce\{/.test(source)) {
      try {
        inner = mathMlToOmml(convertLatexToMathMl(source));
      } catch {
        inner = null;
      }
    }
    if (cache.size > 5000) cache.clear();
    cache.set(source, inner ? `<m:oMath>${inner}</m:oMath>` : null);
  }
  return cache.get(source) ?? null;
}

// ---- Chemistry ----

export type ChemPiece = { text: string; script?: "sub" | "sup" };

/**
 * A chemistry formula typed the simple way ("2H2 + O2 -> 2H2O", "Fe^3+",
 * "CuSO4*5H2O") → pieces of text with small numbers below / above, which
 * Word shows with ordinary subscript / superscript. Returns null for
 * anything more special (conditions over an arrow…): then a picture is used.
 */
export function chemPieces(latex: string): ChemPiece[] | null {
  const source = chemSource(latex)?.trim();
  if (!source || /[\\{}_$]|\[|\]/.test(source)) return null;
  const pieces: ChemPiece[] = [];
  const push = (text: string, script?: "sub" | "sup") => {
    const last = pieces[pieces.length - 1];
    if (last && last.script === script) last.text += text;
    else pieces.push({ text, script });
  };
  const ARROWS: [string, string][] = [["<=>", " ⇌ "], ["<->", " ↔ "], ["->", " → "], ["<-", " ← "]];
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const arrow = ARROWS.find(([code]) => rest.startsWith(code));
    const previous = source[i - 1] ?? " ";
    let match: RegExpMatchArray | null;
    if (arrow) {
      push(arrow[1]);
      i += arrow[0].length;
    } else if ((match = rest.match(/^\^(\d*[+-]|[+-]?\d+)/))) {
      push(match[1].replace("-", "−"), "sup"); // charges: Fe^3+, O^2-
      i += match[0].length;
    } else if (rest[0] === "^") {
      return null;
    } else if ((match = rest.match(/^\d+/)) && /[A-Za-z)\]]/.test(previous)) {
      push(match[0], "sub"); // a number right after an element or bracket: H2, (OH)2
      i += match[0].length;
    } else if ((match = rest.match(/^[+-]/)) && /[A-Za-z)\d]/.test(previous) && isChargeAt(source, i)) {
      push(match[0].replace("-", "−"), "sup"); // "Na+" , "Cl-" at the end of a formula
      i += 1;
    } else if (rest[0] === "*" || rest[0] === "·") {
      push("·"); // hydrate: CuSO4*5H2O
      i += 1;
    } else if (/\s/.test(rest[0])) {
      if (!pieces.length || !pieces[pieces.length - 1].text.endsWith(" ")) push(" ");
      i += 1;
    } else {
      push(rest[0]);
      i += 1;
    }
  }
  const tidy = pieces.map((piece) => ({ ...piece, text: piece.script ? piece.text : piece.text.replace(/ {2,}/g, " ") })).filter((piece) => piece.text);
  return tidy.length ? tidy : null;
}

/** "+" or "-" directly after a formula and before a space / the end is a charge (Na+), not "plus". */
function isChargeAt(source: string, index: number): boolean {
  const after = source[index + 1];
  return after === undefined || after === " " || after === ")";
}
