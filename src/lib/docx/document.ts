/**
 * Writes a Word (.docx) file from a simple description: paragraphs made of
 * "runs" (pieces of text, formulas, pictures) and tables.
 *
 * A .docx is a ZIP of XML files; the main one is word/document.xml. Only
 * what MathTest needs is supported: A4, a Georgian-capable font, bold /
 * italic / underline / boxed text, sub- and superscript, Word equations,
 * pictures, writing lines, simple tables and page breaks.
 */
import { escapeXml } from "./omml";
import { zip, type ZipFile } from "./zip";

export type DocxImage = { data: Uint8Array; type: "png" | "jpeg"; /** Shown size in CSS pixels (96 per inch). */ width: number; height: number };

export type Run =
  | { text: string; bold?: boolean; italic?: boolean; underline?: boolean; box?: boolean; script?: "sub" | "sup"; /** Font size in points. */ size?: number; grey?: boolean }
  | { math: string }
  | { image: DocxImage }
  | { lineBreak: true }
  | { tab: true };

export type Paragraph = {
  kind: "p";
  runs: Run[];
  align?: "center" | "right";
  /** Space above / below, in points. */
  before?: number;
  after?: number;
  /** Left indent in millimetres; `hanging` pulls the first line back (for "1." numbers). */
  indent?: number;
  hanging?: number;
  /** A thin line under the paragraph: a line to write on. */
  line?: boolean;
  keepNext?: boolean;
  pageBreakBefore?: boolean;
  /** A right-aligned tab stop at the right margin (for "…text <tab> (2 points)"). */
  rightTab?: boolean;
};

export type Table = { kind: "table"; /** Column widths in millimetres. */ widths: number[]; rows: Paragraph[][][]; borders?: boolean };
export type Block = Paragraph | Table;

/** A4 with 20 mm margins: 170 mm of text width. */
export const PAGE_MM = { width: 210, height: 297, margin: 20 };
export const TEXT_WIDTH_MM = PAGE_MM.width - 2 * PAGE_MM.margin;
/** Georgian school documents are normally typed in Sylfaen (on every Windows computer); Word picks a similar font elsewhere. */
export const FONT = "Sylfaen";

const twips = (mm: number) => Math.round((mm / 25.4) * 1440); // 1 twip = 1/20 point
const points = (pt: number) => Math.round(pt * 20);
const EMU_PER_PX = 9525;
const MAX_IMAGE_PX = Math.floor((TEXT_WIDTH_MM / 25.4) * 96);

class Writer {
  images: { name: string; image: DocxImage }[] = [];

  run(run: Run): string {
    if ("math" in run) return run.math;
    if ("lineBreak" in run) return "<w:r><w:br/></w:r>";
    if ("tab" in run) return "<w:r><w:tab/></w:r>";
    if ("image" in run) return this.picture(run.image);
    if (!run.text) return "";
    const props = [
      run.bold ? "<w:b/><w:bCs/>" : "",
      run.italic ? "<w:i/><w:iCs/>" : "",
      run.grey ? '<w:color w:val="595959"/>' : "",
      run.size ? `<w:sz w:val="${Math.round(run.size * 2)}"/><w:szCs w:val="${Math.round(run.size * 2)}"/>` : "",
      run.underline ? '<w:u w:val="single"/>' : "",
      run.box ? '<w:bdr w:val="single" w:sz="4" w:space="0" w:color="auto"/>' : "",
      run.script ? `<w:vertAlign w:val="${run.script === "sub" ? "subscript" : "superscript"}"/>` : "",
    ].join("");
    // A new line inside the text is a line break in Word.
    const lines = run.text.split("\n").map((line) => `<w:t xml:space="preserve">${escapeXml(line)}</w:t>`);
    return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}${lines.join("<w:br/>")}</w:r>`;
  }

  picture(image: DocxImage): string {
    const id = this.images.length + 1;
    const name = `image${id}.${image.type === "jpeg" ? "jpg" : "png"}`;
    this.images.push({ name, image });
    const scale = Math.min(1, MAX_IMAGE_PX / Math.max(1, image.width));
    const cx = Math.max(1, Math.round(image.width * scale * EMU_PER_PX));
    const cy = Math.max(1, Math.round(image.height * scale * EMU_PER_PX));
    return (
      `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Picture ${id}"/>` +
      `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
      `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="rImg${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>` +
      `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
    );
  }

  paragraph(p: Paragraph): string {
    // The order of these settings is fixed by the file format.
    const props = [
      p.keepNext ? "<w:keepNext/>" : "",
      p.pageBreakBefore ? "<w:pageBreakBefore/>" : "",
      p.line ? '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="7F7F7F"/></w:pBdr>' : "",
      p.rightTab ? `<w:tabs><w:tab w:val="right" w:pos="${twips(TEXT_WIDTH_MM)}"/></w:tabs>` : "",
      p.before !== undefined || p.after !== undefined ? `<w:spacing w:before="${points(p.before ?? 0)}" w:after="${points(p.after ?? 4)}"/>` : "",
      p.indent || p.hanging ? `<w:ind w:left="${twips(p.indent ?? 0)}"${p.hanging ? ` w:hanging="${twips(p.hanging)}"` : ""}/>` : "",
      p.align ? `<w:jc w:val="${p.align}"/>` : "",
    ].join("");
    return `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ""}${p.runs.map((run) => this.run(run)).join("")}</w:p>`;
  }

  table(table: Table): string {
    const border = (side: string) => `<w:${side} w:val="${table.borders ? "single" : "nil"}" w:sz="4" w:space="0" w:color="7F7F7F"/>`;
    const borders = ["top", "left", "bottom", "right", "insideH", "insideV"].map(border).join("");
    const grid = table.widths.map((width) => `<w:gridCol w:w="${twips(width)}"/>`).join("");
    const rows = table.rows
      .map((row) => {
        const cells = row.map((cell, i) => {
          // Word needs at least one paragraph in every cell.
          const content = (cell.length ? cell : [{ kind: "p", runs: [] } as Paragraph]).map((p) => this.paragraph(p)).join("");
          return `<w:tc><w:tcPr><w:tcW w:w="${twips(table.widths[i] ?? table.widths[0])}" w:type="dxa"/></w:tcPr>${content}</w:tc>`;
        });
        return `<w:tr>${cells.join("")}</w:tr>`;
      })
      .join("");
    return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${borders}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows}</w:tbl>`;
  }
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NAMESPACES =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';

/** The whole .docx file as bytes. `language`: the proofing language Word should use (ka-GE / en-GB). */
export function buildDocx({ title, blocks, language = "ka-GE" }: { title: string; blocks: Block[]; language?: string }): Uint8Array {
  const writer = new Writer();
  let body = blocks.map((block) => (block.kind === "table" ? writer.table(block) : writer.paragraph(block))).join("");
  // A document may not end with a table (Word wants a last paragraph).
  if (blocks.length === 0 || blocks[blocks.length - 1].kind === "table") body += "<w:p/>";
  const margin = twips(PAGE_MM.margin);
  const section = `<w:sectPr><w:pgSz w:w="${twips(PAGE_MM.width)}" w:h="${twips(PAGE_MM.height)}"/><w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`;
  const document = `${XML}<w:document ${NAMESPACES}><w:body>${body}${section}</w:body></w:document>`;

  const styles =
    `${XML}<w:styles ${NAMESPACES}><w:docDefaults><w:rPrDefault><w:rPr>` +
    `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}" w:cs="${FONT}"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="${language}" w:eastAsia="${language}" w:bidi="ar-SA"/>` +
    `</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;

  const imageTypes = new Set(writer.images.map(({ image }) => image.type));
  const contentTypes =
    `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
    (imageTypes.has("png") ? '<Default Extension="png" ContentType="image/png"/>' : "") +
    (imageTypes.has("jpeg") ? '<Default Extension="jpg" ContentType="image/jpeg"/>' : "") +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;

  const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const rootRels =
    `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const documentRels =
    `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/styles" Target="styles.xml"/>` +
    writer.images.map(({ name }, i) => `<Relationship Id="rImg${i + 1}" Type="${REL}/image" Target="media/${name}"/>`).join("") +
    `</Relationships>`;
  const core =
    `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">` +
    `<dc:title>${escapeXml(title)}</dc:title><dc:creator>MathTest</dc:creator></cp:coreProperties>`;

  const text = (name: string, content: string): ZipFile => ({ name, data: new TextEncoder().encode(content) });
  return zip([
    text("[Content_Types].xml", contentTypes), // must come first
    text("_rels/.rels", rootRels),
    text("word/document.xml", document),
    text("word/styles.xml", styles),
    text("word/_rels/document.xml.rels", documentRels),
    text("docProps/core.xml", core),
    ...writer.images.map(({ name, image }) => ({ name: `word/media/${name}`, data: image.data })),
  ]);
}
