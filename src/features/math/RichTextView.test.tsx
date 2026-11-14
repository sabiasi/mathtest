import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RichText } from "@/lib/richText";
import { RichTextView } from "./RichTextView";

const html = (value: RichText) => renderToStaticMarkup(<RichTextView value={value} />);
const count = (text: string, part: string) => text.split(part).length - 1;

describe("RichTextView formatting", () => {
  it("draws bold, italic and underline together", () => {
    expect(html([{ type: "text", text: "word", marks: ["bold", "italic", "underline"] }])).toContain("<strong><em><u>word</u></em></strong>");
  });

  it("draws ONE word box around a phrase with mixed formatting", () => {
    const out = html([
      { type: "text", text: "plain " },
      { type: "text", text: "go ", marks: ["box"] },
      { type: "text", text: "went", marks: ["bold", "box", "underline"] },
      { type: "text", text: " gone", marks: ["box"] },
      { type: "text", text: " end" },
    ]);
    expect(count(out, 'class="rt-box"')).toBe(1);
    expect(out).toContain('<span class="rt-box">go <strong><u>went</u></strong> gone</span>');
  });

  it("keeps a formula inside the box, and separate boxes separate", () => {
    const out = html([
      { type: "text", text: "a", marks: ["box"] },
      { type: "math", latex: "x^2", marks: ["box"] },
      { type: "text", text: " and " },
      { type: "text", text: "b", marks: ["box"] },
    ]);
    expect(count(out, 'class="rt-box"')).toBe(2);
    expect(out.indexOf("math-static")).toBeLessThan(out.indexOf(" and "));
  });
});
