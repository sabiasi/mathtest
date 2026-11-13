/**
 * Splitting reading texts and poems (pure functions, no React), used by the
 * print page to continue long texts on the next page.
 */

/** One paragraph per non-empty line. */
export const paragraphs = (body: string) => body.split("\n").map((line) => line.trim()).filter(Boolean);

/** Stanzas are separated by empty lines; each stanza is a list of verses (spaces kept). */
export const stanzas = (body: string) =>
  body
    .replace(/\r/g, "")
    .split(/\n[ \t]*\n/)
    .map((stanza) => stanza.split("\n").filter((verse) => verse.trim() !== ""))
    .filter((verses) => verses.length > 0);

/** Essay lines printed together with the question; the rest follow in blocks of 10. */
export const ESSAY_FIRST = 8;
export const ESSAY_CHUNK = 10;
