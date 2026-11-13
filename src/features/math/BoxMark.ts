/**
 * A "word box": text drawn inside a thin border, like the boxes of words
 * in English exercises ("Use the words in the box"). A TipTap mark, like
 * bold or underline; saved as the mark "box" in our RichText.
 */
import { Mark } from "@tiptap/core";

export const BoxMark = Mark.create({
  name: "box",
  parseHTML() {
    return [{ tag: "span.rt-box" }];
  },
  renderHTML() {
    return ["span", { class: "rt-box" }, 0];
  },
});
