import { describe, expect, it } from "vitest";
import { buildCrossword, buildWordSearch, puzzleWord } from "./puzzles";

const entries = ["apple", "banana", "pear", "lemon", "orange", "grape"].map((word, i) => ({ id: String(i), word, clue: `clue ${word}` }));

describe("crossword", () => {
  it("places the words so that they cross, with matching letters", () => {
    const puzzle = buildCrossword(entries, 7);
    expect(puzzle.placed.length + puzzle.unplaced.length).toBe(6);
    expect(puzzle.placed.length).toBeGreaterThanOrEqual(5);
    for (const p of puzzle.placed) {
      for (let i = 0; i < p.word.length; i++) {
        const r = p.row + (p.across ? 0 : i);
        const c = p.col + (p.across ? i : 0);
        expect(puzzle.grid[r][c]).toBe(p.word[i]);
      }
    }
  });

  it("numbers clues in reading order, and is repeatable", () => {
    const puzzle = buildCrossword(entries, 7);
    const numbers = [...new Set(puzzle.placed.map((p) => p.number))].sort((a, b) => a - b);
    expect(numbers[0]).toBe(1);
    expect(buildCrossword(entries, 7)).toEqual(puzzle);
  });

  it("reports words that share no letter with the others", () => {
    const puzzle = buildCrossword([{ id: "a", word: "abc", clue: "" }, { id: "b", word: "xyz", clue: "" }], 1);
    expect(puzzle.unplaced).toEqual(["xyz"]);
  });
});

describe("word search", () => {
  it("hides every word along a straight line", () => {
    const search = buildWordSearch(entries.map((e) => e.word), 10, false, 3);
    expect(search.unplaced).toEqual([]);
    for (const { word, cells } of search.found) expect(cells.map(([r, c]) => search.grid[r][c]).join("")).toBe(word);
    expect(search.grid.flat().every((letter) => /^[A-Z]$/.test(letter))).toBe(true);
  });

  it("is repeatable and writes words in capitals without spaces", () => {
    expect(buildWordSearch(["ice cream"], 8, true, 9)).toEqual(buildWordSearch(["ice cream"], 8, true, 9));
    expect(puzzleWord("ice-cream")).toBe("ICECREAM");
  });
});
