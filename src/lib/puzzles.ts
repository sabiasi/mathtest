/**
 * Crossword and word-search generators (pure functions). A "seed" makes
 * the random choices repeatable: the same words + seed always give the same
 * puzzle, so the answer key matches papers printed earlier. "New layout"
 * just changes the seed.
 */
import { seededRandom, shuffle } from "./variants";

/** Letters only, in capitals: "ice-cream" → "ICECREAM". Keeps any alphabet. */
export const puzzleWord = (word: string) => word.toLocaleUpperCase("en").replace(/[^\p{L}]/gu, "");

// ---------------------------------------------------------------------------
// Crossword
// ---------------------------------------------------------------------------

export type Placed = { id: string; word: string; clue: string; row: number; col: number; across: boolean; number: number };
export type Crossword = {
  width: number;
  height: number;
  /** grid[row][col]: the letter, or null for no cell. */
  grid: (string | null)[][];
  /** Clue numbers by cell "row:col". */
  numbers: Map<string, number>;
  placed: Placed[];
  /** Words that couldn't be fitted in (they share no letters with the others). */
  unplaced: string[];
};

type Cell = string | undefined;

/**
 * Places the words one by one, each crossing a word already placed (where
 * possible at the spot with the most crossings), never touching other words
 * side by side. Longest words first; `seed` breaks ties.
 */
export function buildCrossword(entries: { id: string; word: string; clue: string }[], seed: number): Crossword {
  const random = seededRandom(seed);
  const words = shuffle(
    entries.map((e) => ({ ...e, letters: puzzleWord(e.word) })).filter((e) => e.letters.length >= 2),
    random,
  ).sort((a, b) => b.letters.length - a.letters.length);

  const cells = new Map<string, Cell>();
  const key = (r: number, c: number) => `${r}:${c}`;
  const at = (r: number, c: number) => cells.get(key(r, c));
  const placedRaw: { id: string; word: string; clue: string; letters: string; row: number; col: number; across: boolean }[] = [];
  const unplaced: string[] = [];

  /** How many crossings, or -1 if the word can't go here. */
  function score(letters: string, row: number, col: number, across: boolean): number {
    const dr = across ? 0 : 1;
    const dc = across ? 1 : 0;
    // The cells just before and after the word must be empty.
    if (at(row - dr, col - dc) !== undefined || at(row + dr * letters.length, col + dc * letters.length) !== undefined) return -1;
    let crossings = 0;
    for (let i = 0; i < letters.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const existing = at(r, c);
      if (existing !== undefined) {
        if (existing !== letters[i]) return -1;
        crossings++;
      } else if (at(r + dc, c + dr) !== undefined || at(r - dc, c - dr) !== undefined) {
        return -1; // a new letter may not touch another word from the side
      }
    }
    return crossings;
  }

  for (const entry of words) {
    const { letters } = entry;
    if (placedRaw.length === 0) {
      placedRaw.push({ ...entry, row: 0, col: 0, across: true });
      for (let i = 0; i < letters.length; i++) cells.set(key(0, i), letters[i]);
      continue;
    }
    let best: { row: number; col: number; across: boolean; crossings: number } | null = null;
    for (const [cellKey, letter] of cells) {
      const [r, c] = cellKey.split(":").map(Number);
      for (let i = 0; i < letters.length; i++) {
        if (letters[i] !== letter) continue;
        for (const across of [true, false]) {
          const row = across ? r : r - i;
          const col = across ? c - i : c;
          const crossings = score(letters, row, col, across);
          if (crossings > 0 && (!best || crossings > best.crossings || (crossings === best.crossings && random() < 0.3))) {
            best = { row, col, across, crossings };
          }
        }
      }
    }
    if (!best) {
      unplaced.push(entry.word);
      continue;
    }
    placedRaw.push({ ...entry, row: best.row, col: best.col, across: best.across });
    for (let i = 0; i < letters.length; i++) {
      cells.set(key(best.row + (best.across ? 0 : i), best.col + (best.across ? i : 0)), letters[i]);
    }
  }

  // Crop to the used area.
  const rows = [...cells.keys()].map((k) => Number(k.split(":")[0]));
  const cols = [...cells.keys()].map((k) => Number(k.split(":")[1]));
  const top = rows.length ? Math.min(...rows) : 0;
  const left = cols.length ? Math.min(...cols) : 0;
  const height = rows.length ? Math.max(...rows) - top + 1 : 0;
  const width = cols.length ? Math.max(...cols) - left + 1 : 0;
  const grid = Array.from({ length: height }, (_, r) => Array.from({ length: width }, (_, c) => at(r + top, c + left) ?? null));

  // Number the starting cells in reading order (shared by an across and a down word).
  const starts = placedRaw.map((p) => ({ ...p, row: p.row - top, col: p.col - left })).sort((a, b) => a.row - b.row || a.col - b.col);
  const numbers = new Map<string, number>();
  for (const p of starts) if (!numbers.has(key(p.row, p.col))) numbers.set(key(p.row, p.col), numbers.size + 1);
  const placed: Placed[] = starts.map((p) => ({
    id: p.id,
    word: p.letters,
    clue: p.clue,
    row: p.row,
    col: p.col,
    across: p.across,
    number: numbers.get(key(p.row, p.col))!,
  }));
  return { width, height, grid, numbers, placed, unplaced };
}

// ---------------------------------------------------------------------------
// Word search
// ---------------------------------------------------------------------------

export type WordSearch = {
  size: number;
  grid: string[][];
  /** Where each word is, for the answer key. */
  found: { word: string; cells: [number, number][] }[];
  unplaced: string[];
};

const EASY: [number, number][] = [
  [0, 1],
  [1, 0],
];
const ALL: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
  [0, -1],
  [-1, 0],
  [-1, -1],
  [1, -1],
];

/** Hides the words in a size × size grid (left→right and top→bottom, or all 8 directions), then fills the rest. */
export function buildWordSearch(words: string[], size: number, allDirections: boolean, seed: number): WordSearch {
  const random = seededRandom(seed);
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array<string | null>(size).fill(null));
  const found: WordSearch["found"] = [];
  const unplaced: string[] = [];
  const directions = allDirections ? ALL : EASY;
  const list = words.map(puzzleWord).filter((w) => w.length >= 2).sort((a, b) => b.length - a.length);

  for (const word of list) {
    let placedHere = false;
    for (let attempt = 0; attempt < 200 && !placedHere; attempt++) {
      const [dr, dc] = directions[Math.floor(random() * directions.length)];
      const row = Math.floor(random() * size);
      const col = Math.floor(random() * size);
      const cells: [number, number][] = [];
      let ok = true;
      for (let i = 0; i < word.length && ok; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r < 0 || c < 0 || r >= size || c >= size || (grid[r][c] !== null && grid[r][c] !== word[i])) ok = false;
        else cells.push([r, c]);
      }
      if (!ok) continue;
      cells.forEach(([r, c], i) => (grid[r][c] = word[i]));
      found.push({ word, cells });
      placedHere = true;
    }
    if (!placedHere) unplaced.push(word);
  }

  // The rest: random letters from the words themselves (so it doesn't look odd in Georgian either).
  const alphabet = [...new Set(list.join(""))].join("") || "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const filled = grid.map((row) => row.map((cell) => cell ?? alphabet[Math.floor(random() * alphabet.length)]));
  return { size, grid: filled, found, unplaced };
}
