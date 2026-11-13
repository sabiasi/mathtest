/**
 * Splits questions into printed pages — without ever cutting a question in two.
 *
 * The page measures every question's height first (in pixels), then this
 * function packs them like boxes into columns and pages:
 *
 *   - go down the current column while the next question still fits;
 *   - if it doesn't fit, move to the next column, or to a new page;
 *   - a question taller than a whole column gets a column to itself.
 *
 * It's a "pure" function (numbers in, numbers out), so it's easy to test.
 */

/**
 * `gap`: space before this block, if it isn't the first in its column
 * (default: the normal gap). 0 for a paragraph that continues a reading text.
 */
export type MeasuredBlock = { key: string; height: number; gap?: number };

/** One page: for each column, the keys of the questions in it. */
export type Page = { columns: string[][] };

export function paginate({
  blocks,
  columnHeight,
  columns,
  gap,
  firstPageTop,
}: {
  blocks: MeasuredBlock[];
  /** Usable height of one column on an empty page. */
  columnHeight: number;
  columns: 1 | 2;
  /** Space between two questions. */
  gap: number;
  /** Height taken by the test header on page 1. */
  firstPageTop: number;
}): Page[] {
  const newPage = (): Page => ({ columns: Array.from({ length: columns }, () => []) });
  const pages: Page[] = [newPage()];
  let column = 0;
  let used = 0; // height already filled in the current column

  const available = () => columnHeight - (pages.length === 1 ? firstPageTop : 0);

  for (const block of blocks) {
    const isFirstInColumn = pages[pages.length - 1].columns[column].length === 0;
    const blockGap = block.gap ?? gap;
    const needed = (isFirstInColumn ? 0 : blockGap) + block.height;

    if (!isFirstInColumn && used + needed > available()) {
      // Doesn't fit: next column, or a fresh page.
      column++;
      if (column === columns) {
        pages.push(newPage());
        column = 0;
      }
      used = 0;
    }

    const page = pages[pages.length - 1];
    used += (page.columns[column].length === 0 ? 0 : blockGap) + block.height;
    page.columns[column].push(block.key);
  }

  return pages;
}
