import { describe, expect, it } from "vitest";
import { paginate } from "./paginate";

const blocks = (...heights: number[]) => heights.map((height, i) => ({ key: `q${i + 1}`, height }));

describe("paginate", () => {
  it("keeps everything on one page when it fits", () => {
    const pages = paginate({ blocks: blocks(100, 100, 100), columnHeight: 1000, columns: 1, gap: 10, firstPageTop: 200 });
    expect(pages).toEqual([{ columns: [["q1", "q2", "q3"]] }]);
  });

  it("moves a question that doesn't fit to the next page (never splits it)", () => {
    // page 1: 1000 - 200 header = 800 → q1 (300) + 10 + q2 (300) = 610; q3 would need 920
    const pages = paginate({ blocks: blocks(300, 300, 300), columnHeight: 1000, columns: 1, gap: 10, firstPageTop: 200 });
    expect(pages).toEqual([{ columns: [["q1", "q2"]] }, { columns: [["q3"]] }]);
  });

  it("only page 1 loses space to the header", () => {
    const pages = paginate({ blocks: blocks(500, 500, 490), columnHeight: 1000, columns: 1, gap: 10, firstPageTop: 600 });
    // page 1 has 400: q1 (500) still goes there because a column always takes its first question
    expect(pages.map((p) => p.columns[0])).toEqual([["q1"], ["q2", "q3"]]);
  });

  it("fills the left column, then the right one, then a new page", () => {
    const pages = paginate({ blocks: blocks(400, 400, 400, 400, 400), columnHeight: 900, columns: 2, gap: 10, firstPageTop: 0 });
    expect(pages).toEqual([
      { columns: [["q1", "q2"], ["q3", "q4"]] },
      { columns: [["q5"], []] },
    ]);
  });

  it("gives a too-tall question a column of its own", () => {
    const pages = paginate({ blocks: blocks(100, 2000, 100), columnHeight: 1000, columns: 1, gap: 10, firstPageTop: 0 });
    expect(pages.map((p) => p.columns[0])).toEqual([["q1"], ["q2"], ["q3"]]);
  });

  it("returns one empty page for a test without questions", () => {
    expect(paginate({ blocks: [], columnHeight: 1000, columns: 2, gap: 10, firstPageTop: 300 })).toEqual([
      { columns: [[], []] },
    ]);
  });
});
