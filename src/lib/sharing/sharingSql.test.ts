// @vitest-environment node
/** Sharing and co-editing rules, tested against the REAL SQL (supabase/schema.sql) in a local Postgres (PGlite). */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { plansSql } from "@/lib/plans/plansSql";
import { SUPABASE_STUBS } from "@/lib/server/supabaseStubs";

const db = new PGlite();
const owner = "10000000-0000-0000-0000-000000000001";
const editor = "20000000-0000-0000-0000-000000000002";
const viewer = "30000000-0000-0000-0000-000000000003";
const stranger = "40000000-0000-0000-0000-000000000004";
const mail = { [owner]: "owner@example.test", [editor]: "editor@example.test", [viewer]: "viewer@example.test", [stranger]: "stranger@example.test" };
const PICTURE = "pic-0000-1111-2222";
const doc = (title: string, subject = "math") => JSON.stringify({ id: "t1", title, subjectId: subject, questions: [{ id: "q", images: [{ imageId: PICTURE }] }] });

beforeAll(async () => {
  await db.exec(SUPABASE_STUBS);
  await db.exec(readFileSync("supabase/schema.sql", "utf8"));
  await db.exec(plansSql());
}, 30_000);
afterAll(async () => { await db.close(); });

const setPlan = (plan: string, id: string) => plan === "free"
  ? db.query("update public.subscriptions set plan='free', status='expired' where user_id=$1", [id])
  : db.query("update public.subscriptions set plan=$2, status='active', current_period_end=null where user_id=$1", [id, plan]);
async function as<T>(id: string | null, action: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ""]);
  await db.exec(id ? "set role authenticated" : "set role anon");
  try { return await action(); } finally { await db.exec("reset role"); }
}
const teach = (id: string, subjects: string[]) => db.query(
  "insert into public.teacher_subjects (user_id, subjects, completed_at) values ($1, $2::text[], now()) on conflict (user_id) do update set subjects = excluded.subjects", [id, subjects]);
const share = (email: string, role: "view" | "edit", from = owner) => as(from, () => db.query("insert into public.test_shares (owner_id, test_id, email, role) values ($1, 't1', $2, $3)", [from, email, role]));
const read = (id: string | null) => as(id, async () => (await db.query<{ title: string; version: number }>("select title, version from public.tests where user_id = $1 and id = 't1'", [owner])).rows);
/** A save as the app does it: only if the version is still the one I loaded. Returns the new version, or null. */
const save = (id: string, title: string, expected: number, subject = "math") => as(id, async () => (await db.query<{ version: number }>(
  "update public.tests set title = $2, data = $3::jsonb where user_id = $1 and id = 't1' and version = $4 returning version", [owner, title, doc(title, subject), expected])).rows[0]?.version ?? null);

beforeEach(async () => {
  await db.exec("reset role; truncate auth.users cascade; delete from storage.objects;");
  for (const id of [owner, editor, viewer, stranger]) {
    await db.query("insert into auth.users(id, email) values ($1, $2)", [id, mail[id]]);
    await setPlan(id === owner ? "premium" : "free", id);
    await teach(id, ["math"]);
  }
  await as(owner, () => db.query("insert into public.tests (user_id, id, title, data) values ($1, 't1', 'ალგებრა', $2::jsonb)", [owner, doc("ალგებრა")]));
});

describe("sharing by email", () => {
  it("a test is private until shared; then the invited teacher (and nobody else) can read it", async () => {
    expect(await read(viewer)).toEqual([]);
    await share(mail[viewer], "view");
    expect(await read(viewer)).toEqual([{ title: "ალგებრა", version: 1 }]);
    expect(await read(stranger)).toEqual([]);
    await expect(read(null)).rejects.toThrow(/permission denied/);
    const mine = await as(viewer, () => db.query<{ owner_name: string; role: string; version: number; data: { title: string } }>("select * from public.tests_shared_with_me()"));
    expect(mine.rows).toHaveLength(1);
    expect(mine.rows[0]).toMatchObject({ role: "view", version: 1, data: { title: "ალგებრა" } });
    expect((await as(stranger, () => db.query("select * from public.tests_shared_with_me()"))).rows).toEqual([]);
  });

  it("'view' can't change the test; 'edit' can; nobody but the owner can delete it or move it", async () => {
    await share(mail[viewer], "view");
    await share(mail[editor], "edit");
    expect(await save(viewer, "hacked", 1)).toBeNull();
    expect(await save(editor, "ალგებრა (შესწორებული)", 1)).toBe(2);
    expect(await read(owner)).toEqual([{ title: "ალგებრა (შესწორებული)", version: 2 }]);
    await as(editor, () => db.query("delete from public.tests where user_id = $1", [owner]));
    expect(await read(owner)).toHaveLength(1);
    // An editor can't hand the test to themselves, and can't set the version by hand.
    await as(editor, () => db.query("update public.tests set user_id = $2, version = 99 where user_id = $1 and id = 't1'", [owner, editor]));
    expect(await read(owner)).toEqual([{ title: "ალგებრა (შესწორებული)", version: 3 }]);
    await expect(as(editor, () => db.query("insert into public.tests (user_id, id, data) values ($1, 't2', '{}'::jsonb)", [owner]))).rejects.toThrow(/row-level security/);
  });

  it("only the owner shares, only with a plan that has sharing, and not with themselves", async () => {
    await expect(share(mail[stranger], "edit", editor)).rejects.toThrow(/foreign key|row-level security/);
    await expect(as(editor, () => db.query("insert into public.test_shares (owner_id, test_id, email, role) values ($1, 't1', $2, 'edit')", [owner, mail[editor]]))).rejects.toThrow(/row-level security/);
    await expect(share(mail[owner], "edit")).rejects.toThrow(/row-level security/);
    await expect(share("Not-Lower@example.test", "view")).rejects.toThrow(/check constraint/);
    await share(mail[viewer], "view");
    // A viewer can't promote themselves…
    await as(viewer, () => db.query("update public.test_shares set role = 'edit'"));
    expect(await save(viewer, "hacked", 1)).toBeNull();
    // …but may leave; the owner may change the role or stop sharing.
    await as(owner, () => db.query("update public.test_shares set role = 'edit' where email = $1", [mail[viewer]]));
    expect(await save(viewer, "ერთად", 1)).toBe(2);
    await as(viewer, () => db.query("delete from public.test_shares where email = $1", [mail[viewer]]));
    expect(await read(viewer)).toEqual([]);
    await setPlan("free", owner);
    await expect(share(mail[viewer], "view")).rejects.toThrow(/row-level security/);
  });

  it("people only see the shares that concern them", async () => {
    await share(mail[viewer], "view");
    await share(mail[editor], "edit");
    const emails = async (id: string) => (await as(id, () => db.query<{ email: string }>("select email from public.test_shares order by email"))).rows.map((row) => row.email);
    expect(await emails(owner)).toEqual([mail[editor], mail[viewer]]);
    expect(await emails(viewer)).toEqual([mail[viewer]]);
    expect(await emails(stranger)).toEqual([]);
  });

  it("an unconfirmed email address gets nothing, even if it matches", async () => {
    await share(mail[viewer], "view");
    await db.query("update auth.users set email_confirmed_at = null where id = $1", [viewer]);
    expect(await read(viewer)).toEqual([]);
  });

  it("when the owner's plan ends the shares stop working, and work again when it is back (nothing is deleted)", async () => {
    await share(mail[editor], "edit");
    await setPlan("free", owner);
    expect(await read(editor)).toEqual([]);
    expect(await save(editor, "x", 1)).toBeNull();
    expect((await db.query("select 1 from public.test_shares")).rows).toHaveLength(1);
    await setPlan("school", owner);
    expect(await read(editor)).toHaveLength(1);
  });

  it("the teaching-subject rules still apply: an editor edits only subjects they teach, and can't reclassify a test", async () => {
    await share(mail[editor], "edit");
    await teach(editor, ["physics"]);
    expect(await read(editor)).toHaveLength(1); // reading is fine
    expect(await save(editor, "x", 1)).toBeNull();
    await teach(editor, ["math"]);
    await expect(save(editor, "x", 1, "physics")).rejects.toThrow(/row-level security/);
    expect(await save(editor, "ok", 1)).toBe(2);
  });

  it("at most 30 people per test; deleting the test removes its shares", async () => {
    for (let i = 0; i < 30; i++) await share(`t${i}@example.test`, "view");
    await expect(share("one-too-many@example.test", "view")).rejects.toThrow(/Too many people/);
    await as(owner, () => db.query("delete from public.tests where id = 't1'"));
    expect((await db.query("select 1 from public.test_shares")).rows).toHaveLength(0);
  });
});

describe("no silent overwrites", () => {
  it("every save raises the version; a save based on an old version changes nothing", async () => {
    await share(mail[editor], "edit");
    expect(await save(owner, "მფლობელის ვერსია", 1)).toBe(2);
    // The editor still has version 1 open: refused, the owner's text stays.
    expect(await save(editor, "რედაქტორის ვერსია", 1)).toBeNull();
    expect(await read(owner)).toEqual([{ title: "მფლობელის ვერსია", version: 2 }]);
    // "Keep mine": save again on top of the newest version.
    expect(await save(editor, "რედაქტორის ვერსია", 2)).toBe(3);
    // The owner's stale save is refused in the same way.
    expect(await save(owner, "ძველი", 2)).toBeNull();
    // An "upsert" (the way a brand-new test is saved) also counts as a new version.
    await as(owner, () => db.query("insert into public.tests (user_id, id, title, data) values ($1, 't1', 'upsert', $2::jsonb) on conflict (user_id, id) do update set title = excluded.title, data = excluded.data", [owner, doc("upsert")]));
    expect(await read(owner)).toEqual([{ title: "upsert", version: 4 }]);
  });
});

describe("read-only links", () => {
  const link = () => as(owner, async () => (await db.query<{ token: string }>("insert into public.test_links (owner_id, test_id) values ($1, 't1') returning token", [owner])).rows[0].token);
  const open = (id: string | null, token: string) => as(id, async () => (await db.query<{ t: { data: { title: string }; owner_name: string } | null }>("select public.test_by_link($1) as t", [token])).rows[0].t);

  it("anyone with the secret address can read the test — also signed out; a wrong address gives nothing", async () => {
    const token = await link();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect((await open(null, token))?.data.title).toBe("ალგებრა");
    expect((await open(stranger, token))?.data.title).toBe("ალგებრა");
    expect(await open(null, "0".repeat(64))).toBeNull();
    // A link gives no way to list or change anything.
    await expect(as(null, () => db.query("select * from public.test_links"))).rejects.toThrow(/permission denied/);
    expect((await as(stranger, () => db.query("select * from public.test_links"))).rows).toEqual([]);
    expect(await save(stranger, "hacked", 1)).toBeNull();
  });

  it("the owner can switch the link off; only the owner (with sharing in the plan) can make one", async () => {
    const token = await link();
    await as(stranger, () => db.query("delete from public.test_links"));
    expect(await open(null, token)).not.toBeNull();
    await as(owner, () => db.query("delete from public.test_links where token = $1", [token]));
    expect(await open(null, token)).toBeNull();
    await expect(as(stranger, () => db.query("insert into public.test_links (owner_id, test_id) values ($1, 't1')", [owner]))).rejects.toThrow(/row-level security/);
    const second = await link();
    await setPlan("free", owner);
    expect(await open(null, second)).toBeNull(); // the plan ended: the link sleeps
    await as(owner, () => db.query("delete from public.test_links"));
    await expect(link()).rejects.toThrow(/row-level security/);
  });
});

describe("pictures inside shared tests", () => {
  const put = (holder: string, name = PICTURE) => db.query("insert into storage.objects (bucket_id, name) values ('images', $1)", [`${holder}/${name}`]);
  const visible = (id: string | null) => as(id, async () => (await db.query<{ name: string }>("select name from storage.objects order by name")).rows.map((row) => row.name));
  const path = (id: string | null) => as(id, async () => (await db.query<{ p: string | null }>("select public.shared_picture_path($1, 't1', $2) as p", [owner, PICTURE])).rows[0].p);

  it("a picture is readable by the people the test is shared with — and only pictures that test uses", async () => {
    await put(owner);
    await put(owner, "another-private-picture");
    expect(await visible(viewer)).toEqual([]);
    expect(await path(viewer)).toBeNull();
    await share(mail[viewer], "view");
    expect(await visible(viewer)).toEqual([`${owner}/${PICTURE}`]);
    expect(await path(viewer)).toBe(`${owner}/${PICTURE}`);
    expect(await visible(stranger)).toEqual([]);
    expect(await visible(null)).toEqual([]);
  });

  it("a link opens the test's pictures to its readers, and closing the link closes them", async () => {
    await put(owner);
    await as(owner, () => db.query("insert into public.test_links (owner_id, test_id) values ($1, 't1')", [owner]));
    expect(await visible(null)).toEqual([`${owner}/${PICTURE}`]);
    expect(await path(null)).toBe(`${owner}/${PICTURE}`);
    await as(owner, () => db.query("delete from public.test_links"));
    expect(await visible(null)).toEqual([]);
  });

  it("a picture an editor added (it lives in the editor's folder) is readable by the owner and the other readers", async () => {
    await share(mail[editor], "edit");
    await share(mail[viewer], "view");
    await put(editor);
    expect(await visible(owner)).toEqual([`${editor}/${PICTURE}`]);
    expect(await path(owner)).toBe(`${editor}/${PICTURE}`);
    expect(await path(viewer)).toBe(`${editor}/${PICTURE}`);
    expect(await visible(stranger)).toEqual([]);
    // A viewer's folder is never a source: a viewer can't smuggle a picture into the test.
    await put(viewer);
    expect(await visible(owner)).toEqual([`${editor}/${PICTURE}`]);
    // Sharing never lets anyone write into another teacher's folder.
    await expect(as(editor, () => db.query("insert into storage.objects (bucket_id, name) values ('images', $1)", [`${owner}/x`]))).rejects.toThrow(/row-level security/);
  });
});

describe("the migration", () => {
  it("is safe to apply twice and keeps everything", async () => {
    await share(mail[editor], "edit");
    await save(owner, "v2", 1);
    const sql = readFileSync("supabase/migrations/20261120_sharing.sql", "utf8");
    await db.exec(sql); await db.exec(sql);
    expect(await read(editor)).toEqual([{ title: "v2", version: 2 }]);
  });
});
