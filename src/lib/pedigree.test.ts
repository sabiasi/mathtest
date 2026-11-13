import { describe, expect, it } from "vitest";
import { addChild, addFirstCouple, addPartner, coupleOf, layoutPedigree, movePerson, personNumbers, removePerson, samplePedigree, tidy } from "./pedigree";

let n = 0;
const id = () => `p${n++}`;

describe("pedigree", () => {
  it("the sample family: three generations, two couples", () => {
    const p = samplePedigree(id);
    expect(new Set(p.people.map((x) => x.gen))).toEqual(new Set([0, 1, 2]));
    expect(p.couples).toHaveLength(2);
    expect([...personNumbers(p).values()]).toContain("III-2");
  });

  it("adds a partner next to a person, making room", () => {
    const p = samplePedigree(id);
    const daughter = p.people.find((x) => x.gen === 1 && x.slot === 0)!;
    const next = addPartner(p, daughter.id, id);
    const partner = next.people.find((x) => !p.people.some((y) => y.id === x.id))!;
    expect(partner).toMatchObject({ gen: 1, slot: 1, sex: "male" });
    // Everyone to the right moved one place.
    expect(next.people.filter((x) => x.gen === 1).map((x) => x.slot).sort()).toEqual([0, 1, 2, 3, 4]);
    expect(coupleOf(next, daughter.id)?.b).toBe(partner.id);
    // A person who already has a partner can't get another.
    expect(addPartner(next, daughter.id, id)).toBe(next);
  });

  it("adds children one after another, alternating sons and daughters", () => {
    const empty = addFirstCouple({ people: [], couples: [] }, id);
    const couple = empty.couples[0];
    const one = addChild(empty, couple.id, id);
    const two = addChild(one, couple.id, id);
    const kids = two.people.filter((x) => x.gen === 1).sort((a, b) => a.slot - b.slot);
    expect(kids.map((k) => k.sex)).toEqual(["male", "female"]);
    expect(two.couples[0].children).toHaveLength(2);
  });

  it("removes a person from their couple and their parents' children", () => {
    const p = samplePedigree(id);
    const child = p.couples[0].children[1];
    const next = removePerson(p, child);
    expect(next.people.some((x) => x.id === child)).toBe(false);
    expect(next.couples[0].children).not.toContain(child);
    // Removing a married person removes the couple (the children stay).
    const parent = p.couples[1].a;
    const without = removePerson(p, parent);
    expect(without.couples).toHaveLength(1);
    expect(without.people).toHaveLength(p.people.length - 1);
  });

  it("moves people left and right, swapping with a neighbour; tidy closes gaps", () => {
    const p = samplePedigree(id);
    const first = p.people.find((x) => x.gen === 0 && x.slot === 1)!;
    expect(movePerson(p, first.id, -1).people.find((x) => x.id === first.id)!.slot).toBe(0);
    const swapped = movePerson(p, first.id, 1);
    expect(swapped.people.find((x) => x.id === first.id)!.slot).toBe(2);
    expect(swapped.people.filter((x) => x.gen === 0).map((x) => x.slot).sort()).toEqual([1, 2]);
    expect(tidy(p).people.filter((x) => x.gen === 0).map((x) => x.slot).sort()).toEqual([0, 1]);
  });

  it("draws a marriage line and lines down to every child", () => {
    const p = samplePedigree(id);
    const layout = layoutPedigree(p, false);
    // 2 couples: marriage + drop + siblings' line + one line per child (3 + 2).
    expect(layout.lines).toHaveLength(2 * 3 + 5);
    expect(layout.generations.map((g) => g.label)).toEqual(["I", "II", "III"]);
  });
});
