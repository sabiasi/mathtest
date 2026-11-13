/**
 * Dichotomous keys (biology): numbered yes/no questions that lead to
 * organisms. Printed as a list ("1. Has wings? Yes → 2; No → spider") or as
 * a tree. Pure functions: sample, numbering, the tree and its layout.
 */
import type { DichotomousKeyQuestion, KeyCouplet, KeyLead } from "@/lib/storage/types";

export const KEY_LIMITS = { couplets: 10, treeLeaves: 7 };

/** A ready taxonomy example: the human being (domain → species). */
export const HUMAN_TAXONOMY = {
  organism: "ადამიანი",
  ranks: {
    domain: "ევკარიოტები",
    kingdom: "ცხოველები",
    phylum: "ქორდიანები",
    class: "ძუძუმწოვრები",
    order: "პრიმატები",
    family: "ჰომინიდები",
    genus: "Homo",
    species: "Homo sapiens",
  },
};

const leaf = (organism: string, hide = false): KeyLead => ({ next: null, organism, hide });

/** Wings? → feathers? (bird / butterfly) ; 8 legs? (spider / earthworm). */
export function sampleKey(newId: () => string): KeyCouplet[] {
  const [one, two, three] = [newId(), newId(), newId()];
  return [
    { id: one, question: "აქვს ფრთები?", yes: { next: two, organism: "", hide: false }, no: { next: three, organism: "", hide: false } },
    { id: two, question: "სხეული ბუმბულით აქვს დაფარული?", yes: leaf("ჩიტი"), no: leaf("პეპელა", true) },
    { id: three, question: "აქვს რვა ფეხი?", yes: leaf("ობობა", true), no: leaf("ჭიაყელა") },
  ];
}

/** "1", "2"… by position in the list (the first is where the key starts). */
export function coupletNumbers(couplets: readonly KeyCouplet[]): Map<string, number> {
  return new Map(couplets.map((c, i) => [c.id, i + 1]));
}

/** Answers that lead nowhere (no next question and no organism): the key isn't finished. */
export function looseLeads(couplets: readonly KeyCouplet[]): number {
  const ids = new Set(couplets.map((c) => c.id));
  return couplets.flatMap((c) => [c.yes, c.no]).filter((l) => (l.next ? !ids.has(l.next) : !l.organism.trim())).length;
}

/** Removes a question; answers that led to it become empty organism answers. */
export function removeCouplet(couplets: readonly KeyCouplet[], id: string): KeyCouplet[] {
  const fix = (l: KeyLead): KeyLead => (l.next === id ? { ...l, next: null } : l);
  return couplets.filter((c) => c.id !== id).map((c) => ({ ...c, yes: fix(c.yes), no: fix(c.no) }));
}

export type KeyTree =
  | { kind: "question"; couplet: KeyCouplet; number: number; yes: KeyTree; no: KeyTree }
  | { kind: "organism"; lead: KeyLead };

/** The key as a tree, starting at the first question (a loop back to an earlier question ends as an empty organism). */
export function keyTree(question: Pick<DichotomousKeyQuestion, "couplets">): KeyTree | null {
  const numbers = coupletNumbers(question.couplets);
  const byId = new Map(question.couplets.map((c) => [c.id, c]));
  const build = (couplet: KeyCouplet, seen: Set<string>): KeyTree => {
    const follow = (lead: KeyLead): KeyTree => {
      const next = lead.next ? byId.get(lead.next) : undefined;
      if (next && !seen.has(next.id)) return build(next, new Set([...seen, next.id]));
      return { kind: "organism", lead: next ? leaf("?") : lead };
    };
    return { kind: "question", couplet, number: numbers.get(couplet.id) ?? 0, yes: follow(couplet.yes), no: follow(couplet.no) };
  };
  const first = question.couplets[0];
  return first ? build(first, new Set([first.id])) : null;
}

export function leafCount(tree: KeyTree): number {
  return tree.kind === "organism" ? 1 : leafCount(tree.yes) + leafCount(tree.no);
}

/** Drawing units for the tree. */
export const TREE_UNITS = { slot: 112, level: 84, questionW: 104, organismW: 96, organismH: 24, line: 11 };

export type TreeNodeLayout = { node: KeyTree; x: number; y: number; parent?: { x: number; y: number; answer: "yes" | "no" } };

/** Leaves in order from left to right (one slot each); a question sits above the middle of its two answers. */
export function layoutKeyTree(tree: KeyTree): { nodes: TreeNodeLayout[]; width: number; height: number } {
  type Raw = { node: KeyTree; x: number; y: number; parent: number | null; answer: "yes" | "no" };
  const raw: Raw[] = [];
  let nextSlot = 0;
  let depth = 0;
  const place = (node: KeyTree, level: number, parent: number | null, answer: "yes" | "no"): number => {
    depth = Math.max(depth, level);
    const index = raw.length;
    raw.push({ node, x: 0, y: TREE_UNITS.level / 2 + level * TREE_UNITS.level, parent, answer });
    if (node.kind === "organism") raw[index].x = TREE_UNITS.slot / 2 + nextSlot++ * TREE_UNITS.slot;
    else {
      const yes = place(node.yes, level + 1, index, "yes");
      const no = place(node.no, level + 1, index, "no");
      raw[index].x = (raw[yes].x + raw[no].x) / 2;
    }
    return index;
  };
  place(tree, 0, null, "yes");
  const nodes = raw.map((r) => ({
    node: r.node,
    x: r.x,
    y: r.y,
    parent: r.parent === null ? undefined : { x: raw[r.parent].x, y: raw[r.parent].y, answer: r.answer },
  }));
  return { nodes, width: Math.max(1, nextSlot) * TREE_UNITS.slot, height: (depth + 1) * TREE_UNITS.level };
}

/** Splits a question into lines of about `max` characters (at spaces), at most 3 lines. */
export function wrapLines(text: string, max = 18): string[] {
  const lines: string[] = [];
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const last = lines.at(-1);
    if (last !== undefined && (last + " " + word).length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  if (lines.length > 3) return [...lines.slice(0, 2), `${lines.slice(2).join(" ").slice(0, max - 1)}…`];
  return lines.length ? lines : [""];
}
