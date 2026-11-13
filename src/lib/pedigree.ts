/**
 * Pedigree charts (biology): people in generations (I, II, III…), couples,
 * and their children. Each person sits in a "slot" (0, 1, 2…) of their
 * generation's row; the lines are worked out from the couples. Pure
 * functions: the editor calls them, the drawing is in PedigreeView.tsx.
 */
import { toRoman } from "@/lib/roman";
import type { PedigreeCouple, PedigreePerson, PedigreeQuestion } from "@/lib/storage/types";

export const PEDIGREE_LIMITS = { generations: 4, slots: 12, people: 30 };

type Pedigree = Pick<PedigreeQuestion, "people" | "couples">;

export function newPerson(id: string, gen: number, slot: number, sex: PedigreePerson["sex"]): PedigreePerson {
  return { id, sex, status: "unaffected", gen, slot, deceased: false, text: "", ask: false, answer: "" };
}

/** A small family to start from: grandparents, their three children (one married), two grandchildren. */
export function samplePedigree(newId: () => string): Pedigree {
  const ids = Array.from({ length: 8 }, newId);
  const people: PedigreePerson[] = [
    newPerson(ids[0], 0, 1, "male"),
    newPerson(ids[1], 0, 2, "female"),
    newPerson(ids[2], 1, 0, "female"),
    { ...newPerson(ids[3], 1, 1, "male"), status: "affected" },
    newPerson(ids[4], 1, 2, "female"),
    newPerson(ids[5], 1, 3, "male"),
    newPerson(ids[6], 2, 2, "male"),
    newPerson(ids[7], 2, 3, "female"),
  ];
  const couples: PedigreeCouple[] = [
    { id: newId(), a: ids[0], b: ids[1], children: [ids[2], ids[3], ids[4]] },
    { id: newId(), a: ids[4], b: ids[5], children: [ids[6], ids[7]] },
  ];
  return { people, couples };
}

const byId = (p: Pedigree, id: string) => p.people.find((person) => person.id === id);
export const coupleOf = (p: Pedigree, personId: string) => p.couples.find((c) => c.a === personId || c.b === personId);
export const parentsOf = (p: Pedigree, personId: string) => p.couples.find((c) => c.children.includes(personId));

/** Makes room in a generation: everyone at `slot` or further right moves one place right. */
function shiftRight(people: PedigreePerson[], gen: number, slot: number): PedigreePerson[] {
  return people.map((person) => (person.gen === gen && person.slot >= slot ? { ...person, slot: person.slot + 1 } : person));
}

const fits = (p: Pedigree, gen: number) =>
  p.people.length < PEDIGREE_LIMITS.people && Math.max(-1, ...p.people.filter((x) => x.gen === gen).map((x) => x.slot)) + 1 < PEDIGREE_LIMITS.slots;

export function canAddPartner(p: Pedigree, personId: string): boolean {
  const person = byId(p, personId);
  return !!person && !coupleOf(p, personId) && fits(p, person.gen);
}

/** A husband / wife next to the person (to the right), joined by a marriage line. */
export function addPartner(p: Pedigree, personId: string, newId: () => string): Pedigree {
  const person = byId(p, personId);
  if (!person || !canAddPartner(p, personId)) return p;
  const partner = newPerson(newId(), person.gen, person.slot + 1, person.sex === "male" ? "female" : "male");
  return {
    people: [...shiftRight(p.people, person.gen, person.slot + 1), partner],
    couples: [...p.couples, { id: newId(), a: person.id, b: partner.id, children: [] }],
  };
}

export function canAddChild(p: Pedigree, coupleId: string): boolean {
  const couple = p.couples.find((c) => c.id === coupleId);
  if (!couple) return false;
  const gen = Math.max(byId(p, couple.a)?.gen ?? 0, byId(p, couple.b)?.gen ?? 0) + 1;
  return gen < PEDIGREE_LIMITS.generations && fits(p, gen);
}

/** A child of the couple, in the next generation, after the couple's other children (or under the couple). */
export function addChild(p: Pedigree, coupleId: string, newId: () => string): Pedigree {
  const couple = p.couples.find((c) => c.id === coupleId);
  if (!couple || !canAddChild(p, coupleId)) return p;
  const parents = [byId(p, couple.a), byId(p, couple.b)].filter((x): x is PedigreePerson => !!x);
  const gen = Math.max(...parents.map((x) => x.gen)) + 1;
  const siblings = p.people.filter((x) => couple.children.includes(x.id));
  const slot = siblings.length ? Math.max(...siblings.map((x) => x.slot)) + 1 : Math.min(...parents.map((x) => x.slot));
  // Alternate: after a son a daughter, and the other way round.
  const last = siblings.sort((a, b) => a.slot - b.slot).at(-1);
  const child = newPerson(newId(), gen, slot, last?.sex === "male" ? "female" : "male");
  return {
    people: [...shiftRight(p.people, gen, slot), child],
    couples: p.couples.map((c) => (c.id === coupleId ? { ...c, children: [...c.children, child.id] } : c)),
  };
}

/** A first couple in generation I (for an empty chart). */
export function addFirstCouple(p: Pedigree, newId: () => string): Pedigree {
  const slot = Math.max(-1, ...p.people.filter((x) => x.gen === 0).map((x) => x.slot)) + 1;
  if (slot + 1 >= PEDIGREE_LIMITS.slots || p.people.length + 2 > PEDIGREE_LIMITS.people) return p;
  const man = newPerson(newId(), 0, slot, "male");
  const woman = newPerson(newId(), 0, slot + 1, "female");
  return { people: [...p.people, man, woman], couples: [...p.couples, { id: newId(), a: man.id, b: woman.id, children: [] }] };
}

/**
 * Removes a person: they leave their couple (a couple with one person left
 * is gone) and their parents' list of children. Their own children stay.
 */
export function removePerson(p: Pedigree, personId: string): Pedigree {
  return {
    people: p.people.filter((x) => x.id !== personId),
    couples: p.couples
      .filter((c) => c.a !== personId && c.b !== personId)
      .map((c) => ({ ...c, children: c.children.filter((id) => id !== personId) })),
  };
}

/** Moves a person one place left (-1) or right (+1) in their generation, swapping with a neighbour. */
export function movePerson(p: Pedigree, personId: string, direction: -1 | 1): Pedigree {
  const person = byId(p, personId);
  if (!person) return p;
  const target = person.slot + direction;
  if (target < 0 || target >= PEDIGREE_LIMITS.slots) return p;
  const neighbour = p.people.find((x) => x.gen === person.gen && x.slot === target);
  return {
    ...p,
    people: p.people.map((x) => (x.id === person.id ? { ...x, slot: target } : neighbour && x.id === neighbour.id ? { ...x, slot: person.slot } : x)),
  };
}

/** Closes gaps: in every generation the slots become 0, 1, 2… (order kept). */
export function tidy(p: Pedigree): Pedigree {
  const people = [...p.people];
  for (const gen of new Set(people.map((x) => x.gen))) {
    const row = people.filter((x) => x.gen === gen).sort((a, b) => a.slot - b.slot);
    row.forEach((person, i) => {
      people[people.indexOf(person)] = { ...person, slot: i };
    });
  }
  return { ...p, people };
}

/** "II-3": generation (Roman) and place in the row, counted from the left. */
export function personNumbers(p: Pedigree): Map<string, string> {
  const numbers = new Map<string, string>();
  for (const gen of new Set(p.people.map((x) => x.gen))) {
    p.people
      .filter((x) => x.gen === gen)
      .sort((a, b) => a.slot - b.slot)
      .forEach((person, i) => numbers.set(person.id, `${toRoman(gen + 1)}-${i + 1}`));
  }
  return numbers;
}

// ---------------------------------------------------------------------------
// Geometry (in drawing units; the view scales them)
// ---------------------------------------------------------------------------

export const PEDIGREE_UNITS = { slot: 36, gen: 62, symbol: 16, left: 30, top: 14 };

export type PedigreeLayout = {
  width: number;
  height: number;
  centre: Map<string, { x: number; y: number }>;
  lines: { x1: number; y1: number; x2: number; y2: number }[];
  generations: { label: string; y: number }[];
};

/** Where everyone is drawn, and every line: marriages, the line down to the children, the line over the siblings. */
export function layoutPedigree(p: Pedigree, hasText: boolean): PedigreeLayout {
  const { slot, gen, symbol, left, top } = PEDIGREE_UNITS;
  const half = symbol / 2;
  const centre = new Map(p.people.map((x) => [x.id, { x: left + slot / 2 + x.slot * slot, y: top + half + x.gen * gen }]));
  const lines: PedigreeLayout["lines"] = [];
  for (const couple of p.couples) {
    const a = centre.get(couple.a);
    const b = centre.get(couple.b);
    if (!a || !b) continue;
    const [l, r] = a.x <= b.x ? [a, b] : [b, a];
    if (a.y === b.y) lines.push({ x1: l.x + half, y1: l.y, x2: r.x - half, y2: r.y });
    const kids = couple.children.map((id) => centre.get(id)).filter((c): c is { x: number; y: number } => !!c);
    if (kids.length === 0) continue;
    const mid = (l.x + r.x) / 2;
    const parentY = Math.max(a.y, b.y);
    const kidsY = Math.min(...kids.map((k) => k.y));
    // Room under the parents for their labels, then the siblings' line.
    const sibY = kidsY - half - (gen - symbol) * 0.3;
    lines.push({ x1: mid, y1: parentY, x2: mid, y2: sibY });
    const xs = [...kids.map((k) => k.x), mid];
    lines.push({ x1: Math.min(...xs), y1: sibY, x2: Math.max(...xs), y2: sibY });
    for (const k of kids) lines.push({ x1: k.x, y1: sibY, x2: k.x, y2: k.y - half });
  }
  const maxSlot = Math.max(0, ...p.people.map((x) => x.slot));
  const maxGen = Math.max(0, ...p.people.map((x) => x.gen));
  const generations = Array.from({ length: maxGen + 1 }, (_, g) => ({ label: toRoman(g + 1), y: top + half + g * gen }));
  return {
    width: left + (maxSlot + 1) * slot + 4,
    // Room under the last row: the number, and the text / answer box.
    height: top + maxGen * gen + symbol + (hasText ? 30 : 16),
    centre,
    lines,
    generations,
  };
}
