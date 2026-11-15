/** Version conflicts and tests shared by colleagues, with pretend clouds (no internet). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PRINT_OPTIONS, DEFAULT_VARIANTS, type Test } from "./types";
import {
  getConflicts, getRevision, getSaveState, getShared, getSharedSnapshot, getTest, parseSharedKey, refreshTest, resolveConflict, saveTest,
  setSubjectWriteAccess, sharedKey, startShared, startSync, stopSync, SubjectAccessError, VersionConflictError,
  type SharedBackend, type SharedTest, type TestsBackend,
} from "./testsRepository";

const ME = "me";
const shape = (id: string, title = "", subjectId: Test["subjectId"] = "math"): Test => ({
  id, schoolName: "", title, subjectId, subject: "", grade: "", level: "", date: "", timeLimitMinutes: null, instructions: "", labelStyle: "georgian",
  questions: [], printOptions: { ...DEFAULT_PRINT_OPTIONS }, variants: { ...DEFAULT_VARIANTS, seed: 1 }, folder: "",
  createdAt: "2026-11-12T09:00:00.000Z", updatedAt: "2026-11-12T09:00:00.000Z",
});

/** A pretend cloud that counts versions like the real database: a save over an unseen version is refused. */
function versionedCloud(initial: Test[]) {
  const rows = new Map(initial.map((test) => [test.id, { test, version: 1 }]));
  const seen = new Map(initial.map((test) => [test.id, 1]));
  const backend: TestsBackend = {
    kind: "cloud",
    userId: ME,
    list: async () => [...rows.values()].map((row) => row.test),
    upsert: async (test) => {
      const row = rows.get(test.id);
      if (row && seen.get(test.id) !== row.version) throw new VersionConflictError(row.test, row.version);
      const version = (row?.version ?? 0) + 1;
      rows.set(test.id, { test, version });
      seen.set(test.id, version);
    },
    remove: async (id) => { rows.delete(id); },
    fetch: async (id) => { const row = rows.get(id); return row ? { ...row, changed: seen.get(id) !== row.version } : null; },
    acceptVersion: (id, version) => { seen.set(id, version); },
  };
  /** Someone else (a colleague, another tab) saves. */
  const elsewhere = (test: Test) => rows.set(test.id, { test, version: (rows.get(test.id)?.version ?? 0) + 1 });
  return { backend, rows, elsewhere };
}

const settle = () => vi.advanceTimersByTimeAsync(0);
beforeEach(() => {
  stopSync();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-20T10:00:00.000Z"));
  setSubjectWriteAccess(ME, ["math"]);
});
afterEach(() => {
  stopSync();
  setSubjectWriteAccess(null, []);
  vi.useRealTimers();
});

describe("saving over a version someone else changed", () => {
  it("is refused without overwriting, and waits for the teacher's choice", async () => {
    const cloud = versionedCloud([shape("t", "ჩემი")]);
    await startSync(cloud.backend);
    cloud.elsewhere(shape("t", "კოლეგის"));
    saveTest({ ...getTest("t")!, title: "ჩემი ახალი" });
    await settle();
    expect(cloud.rows.get("t")!.test.title).toBe("კოლეგის"); // nothing was overwritten
    expect(getConflicts()).toMatchObject([{ id: "t", mine: { title: "ჩემი ახალი" }, theirs: { title: "კოლეგის" }, version: 2 }]);
    expect(getSaveState("t")).toBe("saving");
    // Typing on while the window is open only updates "mine"; nothing is sent.
    saveTest({ ...getTest("t")!, title: "ჩემი უახლესი" });
    await settle();
    expect(getConflicts()[0].mine.title).toBe("ჩემი უახლესი");
    expect(cloud.rows.get("t")!.version).toBe(2);
  });

  it("'keep mine' saves my version over theirs", async () => {
    const cloud = versionedCloud([shape("t", "ჩემი")]);
    await startSync(cloud.backend);
    cloud.elsewhere(shape("t", "კოლეგის"));
    const before = getRevision("t");
    saveTest({ ...getTest("t")!, title: "ჩემი ახალი" });
    await settle();
    resolveConflict("t", "mine");
    await settle();
    expect(getConflicts()).toEqual([]);
    expect(cloud.rows.get("t")).toMatchObject({ version: 3, test: { title: "ჩემი ახალი" } });
    expect(getSaveState("t")).toBe("saved");
    expect(getRevision("t")).toBe(before); // the open editor keeps going
  });

  it("'load theirs' shows the newer test, restarts the editor, and later saves work again", async () => {
    const cloud = versionedCloud([shape("t", "ჩემი")]);
    await startSync(cloud.backend);
    cloud.elsewhere(shape("t", "კოლეგის"));
    saveTest({ ...getTest("t")!, title: "ჩემი ახალი" });
    await settle();
    const before = getRevision("t");
    resolveConflict("t", "theirs");
    expect(getTest("t")!.title).toBe("კოლეგის");
    expect(getRevision("t")).toBe(before + 1);
    expect(cloud.rows.get("t")!.version).toBe(2);
    saveTest({ ...getTest("t")!, title: "ერთად" });
    await settle();
    expect(getConflicts()).toEqual([]);
    expect(cloud.rows.get("t")).toMatchObject({ version: 3, test: { title: "ერთად" } });
  });

  it("opening the editor loads a newer copy — but never over my own unsent changes", async () => {
    const cloud = versionedCloud([shape("t", "ძველი")]);
    await startSync(cloud.backend);
    const before = getRevision("t");
    expect(await refreshTest("t")).toBe(false); // nothing new
    cloud.elsewhere(shape("t", "ახალი"));
    expect(await refreshTest("t")).toBe(true);
    expect(getTest("t")!.title).toBe("ახალი");
    expect(getRevision("t")).toBe(before + 1);
    // With a change of mine on its way, the refresh keeps out.
    cloud.elsewhere(shape("t", "კიდევ უფრო ახალი"));
    saveTest({ ...getTest("t")!, title: "ჩემი" });
    expect(await refreshTest("t")).toBe(false);
    expect(getTest("t")!.title).toBe("ჩემი");
  });
});

/** A pretend "shared with me" cloud: one colleague's test. */
function sharedCloud(role: "view" | "edit", test = shape("x", "კოლეგის ტესტი")) {
  const key = sharedKey("owner", test.id);
  const row = { test: { ...test, id: key }, version: 1 };
  let access: "ok" | "gone" | "readonly" = "ok";
  const backend: SharedBackend = {
    list: async () => (access === "gone" ? [] : [{ key, ownerId: "owner", ownerName: "ნინო", role, version: row.version, test: row.test } satisfies SharedTest]),
    save: async (shared, mine) => {
      if (access !== "ok") return access;
      if (shared.version !== row.version) throw new VersionConflictError(row.test, row.version);
      row.test = mine;
      return ++row.version;
    },
    fetch: async () => (access === "gone" ? null : { test: row.test, version: row.version }),
  };
  return { backend, key, row, elsewhere: (title: string) => { row.test = { ...row.test, title }; row.version++; }, setAccess: (next: typeof access) => { access = next; } };
}

describe("tests shared with me", () => {
  beforeEach(async () => {
    await startSync(versionedCloud([shape("own")]).backend);
  });

  it("are kept apart from my own tests, under a 'shared~owner~id' key", async () => {
    const cloud = sharedCloud("edit");
    expect(getSharedSnapshot()).toBeNull(); // still loading
    await startShared(cloud.backend);
    expect(getSharedSnapshot()).toHaveLength(1);
    expect(getTest(cloud.key)).toBeUndefined();
    expect(parseSharedKey(cloud.key)).toEqual({ ownerId: "owner", testId: "x" });
    expect(parseSharedKey("shared~broken")).toBeNull();
  });

  it("'edit': my changes are saved into the colleague's test, version by version", async () => {
    const cloud = sharedCloud("edit");
    await startShared(cloud.backend);
    saveTest({ ...getShared(cloud.key)!.test, title: "შესწორებული" });
    expect(getSaveState(cloud.key)).toBe("saving");
    await settle();
    expect(cloud.row).toMatchObject({ version: 2, test: { title: "შესწორებული" } });
    expect(getShared(cloud.key)!.version).toBe(2);
    expect(getSaveState(cloud.key)).toBe("saved");
  });

  it("'view': nothing is ever sent", async () => {
    const cloud = sharedCloud("view");
    await startShared(cloud.backend);
    saveTest({ ...getShared(cloud.key)!.test, title: "hacked" });
    await settle();
    expect(cloud.row).toMatchObject({ version: 1, test: { title: "კოლეგის ტესტი" } });
  });

  it("the teaching-subject rule applies: no editing in a subject I don't teach, no moving it to another subject", async () => {
    const cloud = sharedCloud("edit", shape("x", "ფიზიკა", "physics"));
    await startShared(cloud.backend);
    expect(() => saveTest({ ...getShared(cloud.key)!.test, title: "ჩემი" })).toThrow(SubjectAccessError);
    stopSync();
    await startSync(versionedCloud([]).backend);
    const math = sharedCloud("edit");
    await startShared(math.backend);
    expect(() => saveTest({ ...getShared(math.key)!.test, subjectId: "physics" })).toThrow(SubjectAccessError);
    await settle();
    expect(math.row.version).toBe(1);
  });

  it("a conflict with the owner asks me too, and 'load theirs' shows the owner's version", async () => {
    const cloud = sharedCloud("edit");
    await startShared(cloud.backend);
    cloud.elsewhere("ავტორის ცვლილება");
    saveTest({ ...getShared(cloud.key)!.test, title: "ჩემი ცვლილება" });
    await settle();
    expect(getConflicts()).toMatchObject([{ id: cloud.key, theirs: { title: "ავტორის ცვლილება" } }]);
    expect(cloud.row.test.title).toBe("ავტორის ცვლილება");
    const before = getRevision(cloud.key);
    resolveConflict(cloud.key, "theirs");
    expect(getShared(cloud.key)).toMatchObject({ version: 2, test: { title: "ავტორის ცვლილება" } });
    expect(getRevision(cloud.key)).toBe(before + 1);
  });

  it("when the owner stops sharing (or lowers me to 'view'), my save changes nothing and the test follows", async () => {
    const cloud = sharedCloud("edit");
    await startShared(cloud.backend);
    cloud.setAccess("readonly");
    saveTest({ ...getShared(cloud.key)!.test, title: "ჩემი" });
    await settle();
    expect(getShared(cloud.key)!.role).toBe("view");
    expect(cloud.row.test.title).toBe("კოლეგის ტესტი");
    cloud.setAccess("gone");
    expect(await refreshTest(cloud.key)).toBe(false);
    expect(getShared(cloud.key)).toBeUndefined();
  });

  it("signing out forgets them", async () => {
    await startShared(sharedCloud("edit").backend);
    stopSync();
    expect(getSharedSnapshot()).toBeNull();
    expect(getConflicts()).toEqual([]);
  });
});
