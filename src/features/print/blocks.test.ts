import { describe, expect, it } from "vitest";
import { createQuestion } from "@/lib/questions";
import type { EssayQuestion, PassageQuestion, PoemQuestion } from "@/lib/storage/types";
import { printBlocks } from "./blocks";

describe("printBlocks", () => {
  it("splits texts into paragraphs / stanzas, essays into blocks of lines, and numbers only questions", () => {
    const passage = { ...createQuestion("passage", { id: "t" }), body: "ერთი.\n\nორი.\nსამი." } as PassageQuestion;
    const q1 = createQuestion("true-false", { id: "q1" });
    const poem = { ...createQuestion("poem", { id: "p" }), body: "ა\nბ\n\n  გ\nდ\n" } as PoemQuestion;
    const essay = { ...createQuestion("essay", { id: "e" }), lines: 30 } as EssayQuestion;
    const blocks = printBlocks([passage, q1, poem, essay]);
    expect(blocks.map((b) => b.key)).toEqual(["t~p0", "t~p1", "t~p2", "q1", "p~s0", "p~s1", "e", "e~l0", "e~l1", "e~l2"]);
    expect(blocks.find((b) => b.key === "q1")?.number).toBe(1);
    expect(blocks.find((b) => b.key === "e")?.number).toBe(2);
    expect(blocks.find((b) => b.key === "t~p0")?.number).toBeNull();
  });

  it("keeps an empty text as one block, so it isn't lost", () => {
    expect(printBlocks([createQuestion("passage", { id: "t" })]).map((b) => b.key)).toEqual(["t~p0"]);
  });
});
