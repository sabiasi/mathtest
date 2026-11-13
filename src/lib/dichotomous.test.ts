import { describe, expect, it } from "vitest";
import { keyTree, layoutKeyTree, leafCount, looseLeads, removeCouplet, sampleKey, wrapLines } from "./dichotomous";

let n = 0;
const id = () => `k${n++}`;

describe("dichotomous keys", () => {
  it("the sample is a complete key with four organisms", () => {
    const couplets = sampleKey(id);
    expect(looseLeads(couplets)).toBe(0);
    const tree = keyTree({ couplets })!;
    expect(leafCount(tree)).toBe(4);
  });

  it("removing a question leaves the answer that led to it unfinished", () => {
    const couplets = sampleKey(id);
    const without = removeCouplet(couplets, couplets[1].id);
    expect(without).toHaveLength(2);
    expect(looseLeads(without)).toBe(1);
  });

  it("a loop back to an earlier question ends instead of going on forever", () => {
    const couplets = sampleKey(id);
    couplets[2] = { ...couplets[2], no: { next: couplets[0].id, organism: "", hide: false } };
    expect(leafCount(keyTree({ couplets })!)).toBe(4);
  });

  it("tree layout: leaves one slot apart, a question above the middle of its answers", () => {
    const tree = keyTree({ couplets: sampleKey(id) })!;
    const { nodes, width } = layoutKeyTree(tree);
    const leaves = nodes.filter((x) => x.node.kind === "organism").map((x) => x.x);
    expect(leaves).toEqual([...leaves].sort((a, b) => a - b));
    expect(width).toBe(4 * 112);
    const root = nodes[0];
    expect(root.parent).toBeUndefined();
    expect(root.x).toBe((nodes.find((x) => x.parent?.answer === "yes" && x.parent.y === root.y)!.x + nodes.find((x) => x.parent?.answer === "no" && x.parent.y === root.y)!.x) / 2);
  });

  it("wraps long questions into at most three lines", () => {
    expect(wrapLines("აქვს ფრთები?")).toEqual(["აქვს ფრთები?"]);
    expect(wrapLines("ძალიან გრძელი კითხვა რომელიც სამ სტრიქონზე მეტს დაიკავებდა და უნდა შემოკლდეს").length).toBe(3);
  });
});
