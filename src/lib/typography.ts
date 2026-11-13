/**
 * Georgian typography for printing: quotation marks „like this“ and the long
 * dash (—). Teachers paste texts from anywhere ("…", “…”, «…», " - "), and
 * the paper should look like a Georgian book.
 *
 *   "ტექსტი"   “ტექსტი”   «ტექსტი»   →  „ტექსტი“
 *   სიტყვა - სიტყვა   სიტყვა -- სიტყვა   სიტყვა – სიტყვა   →  სიტყვა — სიტყვა
 *   - დიალოგი (at the start of a line)   →  — დიალოგი
 *   ...  →  …
 *
 * Ranges without spaces (1801–1804) and hyphenated words stay as they are.
 */
export function georgianTypography(text: string): string {
  let result = text
    .replace(/«/g, "„")
    .replace(/»/g, "“")
    // English closing ” → Georgian closing “ (an opening “ is fixed below)
    .replace(/”/g, "“")
    .replace(/\.\.\./g, "…")
    // A dash with spaces around it, or at the start of a line (dialogue).
    .replace(/(^|\n)[ \t]*(?:--|-|–)[ \t]+/g, "$1— ")
    .replace(/[ \t]+(?:--|-|–)[ \t]+/g, " — ");

  // Straight " and opening “: opening if at the start or after a space / bracket / dash.
  result = result.replace(/["“]/g, (mark, offset: number, whole: string) => {
    const before = offset === 0 ? "" : whole[offset - 1];
    const opening = before === "" || /[\s([{—–-]/.test(before);
    if (mark === "“" && !opening) return "“"; // already a correct closing mark
    return opening ? "„" : "“";
  });
  return result;
}
