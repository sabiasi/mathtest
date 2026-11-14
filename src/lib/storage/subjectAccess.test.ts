import { afterEach, expect, it } from "vitest";
import { normalizeTest } from "./migrate";
import {
  createTest, createTestFromTemplate, duplicateTest, getTest, importTests, saveTest,
  setSubjectWriteAccess, startSync, stopSync, SubjectAccessError,
} from "./testsRepository";
const physics = normalizeTest({ id: "physics-test", subjectId: "physics", questions: [] })!;
const math = normalizeTest({ id: "math-test", subjectId: "math", questions: [] })!;
afterEach(() => { stopSync(); setSubjectWriteAccess(null, []); });

it("guards creation, templates, copies, imports, and both sides of a subject change", async () => {
  await startSync({ kind: "cloud", userId: "teacher", list: async () => [physics, math], upsert: async () => {}, remove: async () => {} });
  setSubjectWriteAccess("teacher", ["math"]);
  expect(() => createTest({ subjectId: "physics" })).toThrow(SubjectAccessError);
  expect(() => createTestFromTemplate(physics)).toThrow(SubjectAccessError);
  expect(() => duplicateTest(physics.id, "copy")).toThrow(SubjectAccessError);
  expect(() => importTests([physics])).toThrow(SubjectAccessError);
  expect(() => saveTest({ ...math, subjectId: "physics" })).toThrow(SubjectAccessError);
  expect(() => saveTest({ ...physics, subjectId: "math" })).toThrow(SubjectAccessError);
  expect(getTest(physics.id)?.subjectId).toBe("physics");
  expect(() => createTest({ subjectId: "math" })).not.toThrow();
});
it("does not reuse another account's subject permissions", async () => {
  setSubjectWriteAccess("old-account", ["math", "physics"]);
  await startSync({ kind: "cloud", userId: "new-account", list: async () => [], upsert: async () => {}, remove: async () => {} });
  expect(() => createTest({ subjectId: "math" })).toThrow(SubjectAccessError);
});
it("keeps guest creation usable in all subjects", async () => {
  await startSync({ kind: "device", list: async () => [], upsert: async () => {}, remove: async () => {} });
  expect(() => createTest({ subjectId: "physics" })).not.toThrow();
});
