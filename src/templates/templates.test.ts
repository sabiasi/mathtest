// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkBalance } from "@/lib/chem";
import { findProblems } from "@/lib/checks";
import { PLANS } from "@/lib/plans/plans";
import { normalizeTest } from "@/lib/storage/migrate";
import { SUBJECT_IDS } from "@/subjects/ids";
import { getToolkit } from "@/subjects/registry";
import { TEMPLATES, templateAllowed, templateInfo } from "./catalog";
import { TEMPLATE_IDS, templateContent } from "./content";

describe("template library", () => {
  it("has templates for every subject, with unique ids", () => {
    expect(new Set(TEMPLATE_IDS).size).toBe(TEMPLATES.length);
    for (const subject of SUBJECT_IDS) expect(TEMPLATES.filter((t) => t.subject === subject).length, subject).toBeGreaterThanOrEqual(2);
  });

  it.each(TEMPLATE_IDS)("%s is a complete, valid test of its subject", (id) => {
    const info = templateInfo(id)!;
    const test = templateContent(id)!;
    expect(test).not.toBeNull();
    // Unchanged by the door every stored test goes through.
    expect(normalizeTest(structuredClone(test))).toEqual(test);
    expect(test.subjectId).toBe(info.subject);
    expect(test.title).toBe(info.title);
    expect(test.questions).toHaveLength(info.questions);
    const offered = getToolkit(info.subject).questionTypes;
    for (const question of test.questions) expect(offered, `${id}: ${question.type}`).toContain(question.type);
    expect(new Set(test.questions.map((q) => q.id)).size).toBe(test.questions.length);
    // Nothing a teacher would have to fix before printing (missing answers, empty questions).
    expect(findProblems(test), id).toEqual([]);
    // Every "balance" equation really is balanced.
    for (const question of test.questions) if (question.type === "balance") for (const equation of question.equations) expect(checkBalance(equation.balanced).status, equation.balanced).toBe("balanced");
    // Every gap word is in its text.
    for (const question of test.questions) if (question.type === "fill-blank") for (const blank of question.blanks) expect(question.body, blank.word).toContain(blank.word);
  });

  it("Free may use exactly the plan's number of templates (the first ones), Premium all", () => {
    const free = PLANS.free.limits.templates;
    expect(free).toBe(5);
    const allowedFree = TEMPLATE_IDS.filter((id) => templateAllowed(id, free));
    expect(allowedFree).toEqual(TEMPLATE_IDS.slice(0, 5));
    // The free ones cover five different subjects.
    expect(new Set(allowedFree.map((id) => templateInfo(id)!.subject)).size).toBe(5);
    expect(TEMPLATE_IDS.every((id) => templateAllowed(id, PLANS.premium.limits.templates))).toBe(true);
    expect(templateAllowed("no-such-template", "all")).toBe(false);
    expect(templateContent("no-such-template")).toBeNull();
  });
});
