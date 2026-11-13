/**
 * Latin species names ("binomial names"): the genus starts with a capital
 * letter, everything else is small — "homo SAPIENS" → "Homo sapiens",
 * "e. coli" → "E. coli". They are printed in italics.
 */
export function formatLatinName(input: string): string {
  const words = input.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (words.length === 0) return "";
  return words
    .map((word, i) => {
      const lower = word.toLocaleLowerCase("en");
      return i === 0 ? lower.charAt(0).toLocaleUpperCase("en") + lower.slice(1) : lower;
    })
    .join(" ");
}
