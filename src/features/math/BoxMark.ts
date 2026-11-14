/**
 * A "word box": text drawn inside a thin border, like the boxes of words
 * in English exercises ("Use the words in the box"). A TipTap mark, like
 * bold or underline; saved as the mark "box" in our RichText.
 */
import { Mark } from "@tiptap/core";

export const BoxMark = Mark.create({
  name: "box",
  // Before bold / italic / underline (their priority is 100): the box is the
  // OUTER wrapper, so a boxed phrase with one bold word is still ONE box —
  // not a row of little boxes, one per piece of formatting.
  priority: 200,
  parseHTML() {
    return [{ tag: "span.rt-box" }];
  },
  renderHTML() {
    return ["span", { class: "rt-box" }, 0];
  },
});
