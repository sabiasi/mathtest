/**
 * Splitting a sentence into words, for the grammar questions where the
 * teacher clicks words (to blank them, mark them, or mark a mistake).
 *
 * A clicked word is remembered as { word, occurrence }: "the 2nd «და» in the
 * text". That survives edits elsewhere in the text, unlike a position number.
 */

export type Token = { text: string; isWord: boolean };
export type WordRef = { word: string; occurrence: number };

// A word: letters/digits, with inner hyphens or apostrophes (e.g. "ვინც-ვინ").
const WORD = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu;

/** "და, ის" → [და][, ][ის] — words and the bits between them. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of text.matchAll(WORD)) {
    if (match.index > last) tokens.push({ text: text.slice(last, match.index), isWord: false });
    tokens.push({ text: match[0], isWord: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last), isWord: false });
  return tokens;
}

/** For each token: its WordRef (words only), so it can be compared with saved ones. */
export function wordRefs(tokens: Token[]): (WordRef | null)[] {
  const seen = new Map<string, number>();
  return tokens.map((token) => {
    if (!token.isWord) return null;
    const occurrence = seen.get(token.text) ?? 0;
    seen.set(token.text, occurrence + 1);
    return { word: token.text, occurrence };
  });
}

export const sameRef = (a: WordRef | null | undefined, b: WordRef | null | undefined) =>
  !!a && !!b && a.word === b.word && a.occurrence === b.occurrence;

/** The index of the token a saved WordRef points to, or -1 if that word is gone. */
export function findRef(tokens: Token[], ref: WordRef): number {
  return wordRefs(tokens).findIndex((r) => sameRef(r, ref));
}
