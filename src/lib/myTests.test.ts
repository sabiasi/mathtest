import { describe, expect, it } from "vitest";
import { normalizeTest } from "./storage/migrate";
import type { Test } from "./storage/types";
import { cleanFolderName, countBySubject, filterTests, foldersOf, gradesOf, groupBySubject, sortTests } from "./myTests";

const make = (id: string, fields: Partial<Test>): Test => normalizeTest({ id, ...fields })!;
const tests = [
  make("a", { title: "წილადები", subjectId: "math", grade: "მე-9 კლასი", createdAt: "2026-01-01", updatedAt: "2026-03-01" }),
  make("b", { title: "ალგებრა", subjectId: "math", grade: "მე-10 კლასი", folder: "I ტრიმესტრი", createdAt: "2026-02-01", updatedAt: "2026-02-01" }),
  make("c", { title: "", subjectId: "physics", grade: "მე-9 კლასი", createdAt: "2026-03-01", updatedAt: "2026-01-01" }),
  make("d", { title: "Unit 3", subjectId: "english", grade: "Grade 9", createdAt: "2026-01-15", updatedAt: "2026-01-15" }),
];

describe("my tests", () => {
  it("counts tests per subject, never mixing them", () => {
    const counts = countBySubject(tests);
    expect(counts.math).toBe(2);
    expect(counts.physics).toBe(1);
    expect(counts.geography).toBe(0);
    expect(groupBySubject(tests).map((g) => g.subjectId)).toEqual(["math", "physics", "english"]);
  });
  it("searches titles, filters by grade and folder", () => {
    expect(filterTests(tests, { search: "  ალგ ", grade: "", folder: null }).map((t) => t.id)).toEqual(["b"]);
    expect(filterTests(tests, { search: "", grade: "მე-9 კლასი", folder: null }).map((t) => t.id)).toEqual(["a", "c"]);
    expect(filterTests(tests, { search: "", grade: "", folder: "" }).map((t) => t.id)).toEqual(["a", "c", "d"]);
    expect(filterTests(tests, { search: "", grade: "", folder: "I ტრიმესტრი" }).map((t) => t.id)).toEqual(["b"]);
  });
  it("sorts by last edited, created and title", () => {
    expect(sortTests(tests, "updated").map((t) => t.id)).toEqual(["a", "b", "d", "c"]);
    expect(sortTests(tests, "created").map((t) => t.id)).toEqual(["c", "b", "d", "a"]);
    expect(sortTests(tests, "title").map((t) => t.id)).toEqual(["b", "a", "d", "c"]);
  });
  it("lists grades in a natural order and folders without duplicates", () => {
    expect(gradesOf(tests.filter((t) => t.subjectId === "math"))).toEqual(["მე-9 კლასი", "მე-10 კლასი"]);
    expect(foldersOf(tests, ["II ტრიმესტრი", "I ტრიმესტრი", " "])).toEqual(["I ტრიმესტრი", "II ტრიმესტრი"]);
    expect(cleanFolderName("  ჩემი   საქაღალდე ")).toBe("ჩემი საქაღალდე");
  });
});
