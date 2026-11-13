import { describe, expect, it } from "vitest";
import { WEB_UNITS, addArrow, freeCell, layoutWeb, moveOrganism, pyramidWidths, removeOrganism, sampleChain, samplePyramid, sampleWeb, twoLines } from "./ecology";

let n = 0;
const id = () => `x${n++}`;

describe("food webs", () => {
  it("samples: a chain left to right, a web with producers at the bottom", () => {
    const chain = sampleChain(id);
    expect(chain.organisms.map((o) => o.name)).toEqual(["ბალახი", "კურდღელი", "მელა"]);
    expect(chain.arrows).toHaveLength(2);
    const web = sampleWeb(id);
    const grass = web.organisms.find((o) => o.name === "ბალახი")!;
    expect(grass.row).toBe(Math.max(...web.organisms.map((o) => o.row)));
  });

  it("arrows run from box edge to box edge, in the direction of energy flow", () => {
    const chain = sampleChain(id);
    const layout = layoutWeb(chain);
    const [first] = layout.arrows;
    const a = layout.centre.get(chain.arrows[0].from)!;
    const b = layout.centre.get(chain.arrows[0].to)!;
    expect(first.x1).toBeCloseTo(a.x + WEB_UNITS.boxW / 2 + WEB_UNITS.gap);
    expect(first.x2).toBeCloseTo(b.x - WEB_UNITS.boxW / 2 - WEB_UNITS.gap);
    expect(first.y1).toBe(first.y2);
  });

  it("adds arrows once only, moves by swapping, removes with the arrows", () => {
    const chain = sampleChain(id);
    const [grass, hare] = chain.organisms;
    expect(addArrow(chain, grass.id, hare.id, id)).toBe(chain);
    expect(addArrow(chain, hare.id, grass.id, id)).toBe(chain);
    expect(addArrow(chain, grass.id, grass.id, id)).toBe(chain);
    const moved = moveOrganism(chain, grass.id, 1, 0);
    expect(moved.organisms.find((o) => o.id === grass.id)!.col).toBe(1);
    expect(moved.organisms.find((o) => o.id === hare.id)!.col).toBe(0);
    expect(removeOrganism(chain, hare.id).arrows).toHaveLength(0);
    expect(freeCell(chain.organisms)).toEqual({ col: 3, row: 0 });
  });

  it("splits long names into two balanced lines", () => {
    expect(twoLines("თაგვი")).toEqual(["თაგვი"]);
    expect(twoLines("ბალახისმჭამელი ხოჭო")).toEqual(["ბალახისმჭამელი", "ხოჭო"]);
  });
});

describe("pyramids", () => {
  it("energy pyramid follows the 10 % rule, bars get narrower", () => {
    const levels = samplePyramid("energy", id);
    expect(levels.map((l) => l.value)).toEqual(["10 000 კჯ", "1 000 კჯ", "100 კჯ", "10 კჯ"]);
    const widths = pyramidWidths(4);
    expect(widths[0]).toBe(100);
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeLessThan(widths[i - 1]);
    expect(Math.min(...pyramidWidths(5))).toBeGreaterThan(20);
  });
});
