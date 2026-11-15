// @vitest-environment node
/** School plan and the founders' admin page, tested against the REAL SQL (supabase/schema.sql) in a local Postgres (PGlite). */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { plansSql } from "@/lib/plans/plansSql";
import { SUPABASE_STUBS } from "@/lib/server/supabaseStubs";

const db = new PGlite();
const founder = "f0000000-0000-0000-0000-000000000001";
const head = "a0000000-0000-0000-0000-000000000002"; // the school admin
const nino = "b0000000-0000-0000-0000-000000000003";
const giorgi = "c0000000-0000-0000-0000-000000000004";
const outsider = "d0000000-0000-0000-0000-000000000005";
const mail: Record<string, string> = { [founder]: "founder@example.test", [head]: "head@school.test", [nino]: "nino@school.test", [giorgi]: "giorgi@school.test", [outsider]: "out@example.test" };

beforeAll(async () => {
  await db.exec(SUPABASE_STUBS);
  await db.exec(readFileSync("supabase/schema.sql", "utf8"));
  await db.exec(plansSql());
}, 30_000);
afterAll(async () => { await db.close(); });

async function as<T>(id: string | null, action: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ""]);
  await db.exec(id ? "set role authenticated" : "set role anon");
  try { return await action(); } finally { await db.exec("reset role"); }
}
/** Calls a database function as `id` and returns its result. */
async function call<T = unknown>(id: string | null, fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const names = Object.keys(args);
  const list = names.map((name, i) => `${name} => $${i + 1}`).join(", ");
  return as(id, async () => (await db.query<{ r: T }>(`select public.${fn}(${list}) as r`, names.map((name) => args[name]))).rows[0].r);
}
const planOf = async (id: string) => (await db.query<{ p: string }>("select public.plan_of($1) as p", [id])).rows[0].p;
const setFree = (id: string) => db.query("update public.subscriptions set plan = 'free', status = 'expired', trial_ends_at = null where user_id = $1", [id]);

/** A founder makes a school of `seats` seats with `head` as its admin. */
async function makeSchool(seats = 3, paidUntil: string | null = null) {
  const made = await call<{ school_id: string; admin: string }>(founder, "admin_create_school", {
    school_name: "თბილისის 51-ე სკოლა", city: "თბილისი", seats, paid_until: paidUntil, admin_email: mail[head], request: null, reason: "invoice 2026/14",
  });
  return made.school_id;
}
const code = async () => (await call<{ school: { join_code: string } }>(head, "school_overview")).school.join_code;

beforeEach(async () => {
  await db.exec("reset role; truncate auth.users cascade; delete from public.schools; delete from public.admin_log; delete from public.school_requests;");
  for (const id of Object.keys(mail)) {
    await db.query("insert into auth.users(id, email) values ($1, $2)", [id, mail[id]]);
    await setFree(id);
  }
  await db.query("insert into public.admins (user_id) values ($1)", [founder]);
});

describe("schools and seats", () => {
  it("a founder creates a school paid by invoice; its admin and the teachers who join get the School plan", async () => {
    const sid = await makeSchool();
    expect(await planOf(head)).toBe("school");
    expect(await call(head, "my_school_seat")).toMatchObject({ school_id: sid, role: "admin", status: "active" });
    expect(await planOf(nino)).toBe("free");
    expect(await call(nino, "join_school", { code: (await code()).toLowerCase() })).toBe("ok"); // any case, spaces ignored
    expect(await planOf(nino)).toBe("school");
    // The School plan has every Premium feature plus the school ones.
    expect((await db.query<{ f: boolean }>("select public.plan_has_feature($1, 'sharedBank') as f", [nino])).rows[0].f).toBe(true);
  });

  it("seats are a hard limit; a wrong or old code joins nobody", async () => {
    await makeSchool(2);
    const first = await code();
    expect(await call(nino, "join_school", { code: "WRONG123" })).toBe("invalid");
    expect(await call(nino, "join_school", { code: first })).toBe("ok");
    expect(await call(giorgi, "join_school", { code: first })).toBe("full"); // head + nino = 2 seats
    expect(await planOf(giorgi)).toBe("free");
    const fresh = await call<string>(head, "school_new_code");
    expect(fresh).toMatch(/^[A-Z2-9]{8}$/);
    expect(fresh).not.toBe(first);
    expect(await call(outsider, "join_school", { code: first })).toBe("invalid");
  });

  it("one school per teacher", async () => {
    await makeSchool();
    expect(await call(nino, "join_school", { code: await code() })).toBe("ok");
    expect(await call(nino, "join_school", { code: await code() })).toBe("alreadyMember");
  });

  it("invites by email: only the invited address can accept, and accepting takes a seat", async () => {
    await makeSchool();
    const invite = await call<{ result: string; invite_id: string; school: string }>(head, "school_invite", { invite_email: " Nino@School.test ", invite_role: "teacher" });
    expect(invite).toMatchObject({ result: "ok", school: "თბილისის 51-ე სკოლა" });
    expect(await call(head, "school_invite", { invite_email: "not an email" })).toMatchObject({ result: "invalid" });
    expect(await call(head, "school_invite", { invite_email: mail[head] })).toMatchObject({ result: "alreadyMember" });
    // Someone else can't see or take it.
    expect(await call(giorgi, "my_school_invites")).toEqual([]);
    expect(await call(giorgi, "accept_school_invite", { invite: invite.invite_id })).toBe("invalid");
    expect(await call<unknown[]>(nino, "my_school_invites")).toHaveLength(1);
    expect(await call(nino, "accept_school_invite", { invite: invite.invite_id })).toBe("ok");
    expect(await planOf(nino)).toBe("school");
    expect(await call(nino, "my_school_invites")).toEqual([]); // used up
  });

  it("an unconfirmed email address can't accept an invitation", async () => {
    await makeSchool();
    const invite = await call<{ invite_id: string }>(head, "school_invite", { invite_email: mail[nino] });
    await db.query("update auth.users set email_confirmed_at = null where id = $1", [nino]);
    expect(await call(nino, "accept_school_invite", { invite: invite.invite_id })).toBe("invalid");
  });

  it("a declined or cancelled invitation is gone", async () => {
    await makeSchool();
    const a = await call<{ invite_id: string }>(head, "school_invite", { invite_email: mail[nino] });
    const b = await call<{ invite_id: string }>(head, "school_invite", { invite_email: mail[giorgi] });
    expect(await call(nino, "decline_school_invite", { invite: a.invite_id })).toBe("ok");
    expect(await call(head, "school_cancel_invite", { invite: b.invite_id })).toBe("ok");
    expect(await call(giorgi, "accept_school_invite", { invite: b.invite_id })).toBe("invalid");
    expect((await call<{ invites: unknown[] }>(head, "school_overview")).invites).toEqual([]);
  });

  it("removing or leaving gives back the teacher's own plan, and deletes nothing of theirs", async () => {
    await makeSchool();
    await call(nino, "join_school", { code: await code() });
    await db.query("insert into public.tests (user_id, id, title, data) values ($1, 't1', 'ჩემი', '{\"subjectId\":\"math\"}')", [nino]);
    expect(await call(head, "school_remove_member", { member: nino })).toBe("ok");
    expect(await planOf(nino)).toBe("free");
    expect((await db.query("select 1 from public.tests where user_id = $1", [nino])).rows).toHaveLength(1);
    // A teacher with their own Premium keeps it after leaving.
    await call(giorgi, "join_school", { code: await code() });
    await call(founder, "admin_set_plan", { uid: giorgi, new_plan: "premium", ends_at: null, reason: "gift for the pilot" });
    expect(await planOf(giorgi)).toBe("school");
    expect(await call(giorgi, "leave_school")).toBe("ok");
    expect(await planOf(giorgi)).toBe("premium");
  });

  it("a school always keeps an admin", async () => {
    await makeSchool();
    await call(nino, "join_school", { code: await code() });
    expect(await call(head, "leave_school")).toBe("lastAdmin");
    expect(await call(head, "school_set_member", { member: head, new_role: "teacher", new_department: "" })).toBe("lastAdmin");
    expect(await call(head, "school_set_member", { member: nino, new_role: "admin", new_department: "მათემატიკა" })).toBe("ok");
    expect(await call(head, "leave_school")).toBe("ok");
    expect(await call(nino, "school_overview")).toMatchObject({ used: 1 });
    expect(await call(head, "school_remove_member", { member: nino }).catch((e: Error) => e.message)).toMatch(/School admins only/);
  });

  it("when the school's paid time ends, its teachers are back on their own plan (seats are kept)", async () => {
    await makeSchool(3, new Date(Date.now() + 86_400_000).toISOString());
    await call(nino, "join_school", { code: await code() });
    expect(await planOf(nino)).toBe("school");
    await db.query("update public.schools set paid_until = now() - interval '1 minute'");
    expect(await planOf(nino)).toBe("free");
    expect(await call(nino, "my_school_seat")).toMatchObject({ role: "teacher" });
    // An ended school takes nobody new.
    expect(await call(giorgi, "join_school", { code: await code() })).toBe("ended");
  });

  it("'View as Free' still lowers a school teacher to Free", async () => {
    await makeSchool();
    await call(head, "set_plan_preview", { free: true });
    expect(await planOf(head)).toBe("free");
  });

  it("teachers can neither write the tables nor manage the school", async () => {
    const sid = await makeSchool();
    await call(nino, "join_school", { code: await code() });
    for (const sql of [
      "insert into public.school_members (user_id, school_id, role) values ($1, $2, 'admin')",
      "update public.school_members set role = 'admin' where user_id = $1 and school_id = $2",
      "update public.schools set seats = 999 where id = $2 and $1::uuid is not null",
      "insert into public.admins (user_id) select $1::uuid where $2::uuid is not null on conflict do nothing",
    ]) {
      await expect(as(nino, () => db.query(sql, [nino, sid]))).rejects.toThrow(/permission denied/);
    }
    for (const fn of ["school_overview", "school_usage", "school_new_code"]) {
      await expect(call(nino, fn)).rejects.toThrow(/School admins only/);
    }
    await expect(call(nino, "school_invite", { invite_email: mail[outsider] })).rejects.toThrow(/School admins only/);
    expect(await planOf(nino)).toBe("school");
    expect((await db.query<{ role: string }>("select role from public.school_members where user_id = $1", [nino])).rows[0].role).toBe("teacher");
    // Signed out: nothing at all.
    await expect(call(null, "my_school_seat")).rejects.toThrow(/permission denied/);
    await expect(call(null, "join_school", { code: "AAAAAAAA" })).rejects.toThrow(/permission denied/);
  });

  it("the usage overview has numbers per teacher, never test titles or contents", async () => {
    await makeSchool();
    await call(nino, "join_school", { code: await code() });
    await db.query("insert into public.tests (user_id, id, title, data) values ($1, 't1', 'საიდუმლო სათაური', '{\"title\":\"საიდუმლო სათაური\"}')", [nino]);
    const usage = await call<Record<string, unknown>[]>(head, "school_usage");
    expect(usage.find((row) => row.email === mail[nino])).toMatchObject({ tests: 1, ai_month: 0, storage_bytes: 0 });
    expect(JSON.stringify(usage)).not.toContain("საიდუმლო");
  });
});

describe("the school's shared question bank", () => {
  const add = (id: string, subject = "math") => call<string>(id, "school_bank_add", {
    subject, department: "მათემატიკა", grade: "VII", question_type: "short", tags: ["ალგებრა"], summary: "2+2", data: { id: "q", type: "short" },
  });

  it("members of an active school share questions; outsiders and Free teachers get nothing", async () => {
    await makeSchool();
    await call(nino, "join_school", { code: await code() });
    const id = await add(nino);
    expect(await call<{ id: string; mine: boolean; author_name: string }[]>(head, "school_bank_list")).toMatchObject([{ id, mine: false }]);
    expect(await call<{ mine: boolean }[]>(nino, "school_bank_list")).toMatchObject([{ mine: true }]);
    expect(await call(outsider, "school_bank_list")).toEqual([]);
    await expect(add(outsider)).rejects.toThrow(/School plan is required/);
    await expect(as(outsider, () => db.query("select * from public.school_bank_questions"))).rejects.toThrow(/permission denied/);
  });

  it("the author or the school admin removes a question; other teachers can't", async () => {
    await makeSchool();
    await call(nino, "join_school", { code: await code() });
    await call(giorgi, "join_school", { code: await code() });
    const a = await add(nino);
    const b = await add(nino);
    expect(await call(giorgi, "school_bank_remove", { question: a })).toBe("invalid");
    expect(await call(nino, "school_bank_remove", { question: a })).toBe("ok");
    expect(await call(head, "school_bank_remove", { question: b })).toBe("ok");
    expect(await call(head, "school_bank_list")).toEqual([]);
  });

  it("a question stays with the school when its author leaves; an ended school's bank is closed", async () => {
    await makeSchool();
    await call(nino, "join_school", { code: await code() });
    await add(nino);
    await call(nino, "leave_school");
    expect(await call<unknown[]>(head, "school_bank_list")).toHaveLength(1);
    expect(await call(nino, "school_bank_list")).toEqual([]);
    await db.query("update public.schools set status = 'ended'");
    expect(await call(head, "school_bank_list")).toEqual([]);
    await expect(add(head)).rejects.toThrow(/School plan is required/);
  });

  it("colleagues may read the pictures the shared questions use — only those", async () => {
    await makeSchool();
    await call(nino, "join_school", { code: await code() });
    await call(nino, "school_bank_add", { subject: "math", department: "", grade: "", question_type: "short", tags: [], summary: "", data: { images: [{ imageId: "pic-1234-abcd" }] } });
    await db.query("insert into storage.objects (bucket_id, name) values ('images', $1), ('images', $2)", [`${nino}/pic-1234-abcd`, `${nino}/private-9999-zzzz`]);
    const visible = (id: string) => as(id, async () => (await db.query<{ name: string }>("select name from storage.objects order by name")).rows.map((row) => row.name));
    expect(await visible(head)).toEqual([`${nino}/pic-1234-abcd`]);
    expect(await visible(outsider)).toEqual([]);
  });
});

describe("the founders' admin page", () => {
  const ADMIN_FUNCTIONS: [string, Record<string, unknown>][] = [
    ["admin_overview", {}], ["admin_users", {}], ["admin_revenue", {}], ["admin_failed_payments", {}], ["admin_ai_usage", {}],
    ["admin_school_requests", {}], ["admin_schools", {}], ["admin_log_list", {}],
    ["admin_set_request", { request: 1, new_status: "won", new_note: "" }],
    ["admin_create_school", { school_name: "x", city: "", seats: 5, paid_until: null, admin_email: "a@b.ge", request: null, reason: "because" }],
    ["admin_update_school", { school: "00000000-0000-0000-0000-000000000000", seats: 5, paid_until: null, new_status: "active", reason: "because" }],
    ["admin_set_plan", { uid: nino, new_plan: "premium", ends_at: null, reason: "because" }],
    ["admin_extend_trial", { uid: nino, days: 7, reason: "because" }],
  ];

  it("every founder function refuses teachers, school admins and signed-out visitors", async () => {
    await makeSchool();
    for (const [fn, args] of ADMIN_FUNCTIONS) {
      for (const who of [nino, head]) await expect(call(who, fn, args), `${fn} as a teacher`).rejects.toThrow(/Founders only/);
      await expect(call(null, fn, args), `${fn} signed out`).rejects.toThrow(/permission denied/);
    }
    expect(await call(nino, "am_i_admin")).toBe(false);
    expect(await call(founder, "am_i_admin")).toBe(true);
    expect(await planOf(nino)).toBe("free");
  });

  it("gift Premium and back to Free: written to the plan history and the audit log, with the reason", async () => {
    await expect(call(founder, "admin_set_plan", { uid: nino, new_plan: "premium", ends_at: null, reason: "" })).rejects.toThrow(/reason is required/);
    expect(await call(founder, "admin_set_plan", { uid: nino, new_plan: "premium", ends_at: new Date(Date.now() + 30 * 86_400_000).toISOString(), reason: "pilot teacher" })).toBe("ok");
    expect(await planOf(nino)).toBe("premium");
    const history = await db.query<{ changed_by: string; reason: string; new_plan: string }>("select changed_by, reason, new_plan from public.subscription_changes where user_id = $1 order by id desc limit 1", [nino]);
    expect(history.rows[0]).toEqual({ changed_by: `admin:${founder}`, reason: "pilot teacher", new_plan: "premium" });
    expect(await call(founder, "admin_set_plan", { uid: nino, new_plan: "free", ends_at: null, reason: "pilot over" })).toBe("ok");
    expect(await planOf(nino)).toBe("free");
    const log = await call<{ action: string; reason: string; admin_email: string }[]>(founder, "admin_log_list");
    expect(log.map((row) => [row.action, row.reason, row.admin_email])).toEqual([["plan.set", "pilot over", mail[founder]], ["plan.set", "pilot teacher", mail[founder]]]);
  });

  it("extends a trial, but never over a paying subscription", async () => {
    expect(await call(founder, "admin_extend_trial", { uid: nino, days: 10, reason: "asked by email" })).toBe("ok");
    expect(await planOf(nino)).toBe("premium");
    const ends = (await db.query<{ t: Date }>("select trial_ends_at as t from public.subscriptions where user_id = $1", [nino])).rows[0].t;
    expect(Math.round((ends.getTime() - Date.now()) / 86_400_000)).toBe(10);
    await db.query("update public.subscriptions set plan = 'premium', status = 'active', current_period_end = now() + interval '20 days' where user_id = $1", [giorgi]);
    expect(await call(founder, "admin_extend_trial", { uid: giorgi, days: 10, reason: "asked by email" })).toBe("paying");
    expect(await call(founder, "admin_extend_trial", { uid: nino, days: 500, reason: "too long" })).toBe("invalid");
  });

  it("a school request moves through new → contacted → won, and 'create school' links it", async () => {
    await as(null, () => db.query("insert into public.school_requests (contact_name, school_name, email, teachers) values ('ნინო', '51-ე სკოლა', 'head@school.test', 12)"));
    const [request] = await call<{ id: number; status: string }[]>(founder, "admin_school_requests");
    expect(request.status).toBe("new");
    expect(await call(founder, "admin_set_request", { request: request.id, new_status: "contacted", new_note: "called on Monday" })).toBe("ok");
    expect(await call(founder, "admin_set_request", { request: request.id, new_status: "bogus", new_note: "" })).toBe("invalid");
    const made = await call<{ school_id: string; admin: string }>(founder, "admin_create_school", {
      school_name: "51-ე სკოლა", city: "", seats: 12, paid_until: null, admin_email: "HEAD@school.test", request: request.id, reason: "invoice 7 paid",
    });
    expect(made.admin).toBe("member"); // the contact already has an account
    const [after] = await call<{ status: string; school_id: string; note: string }[]>(founder, "admin_school_requests");
    expect(after).toMatchObject({ status: "won", school_id: made.school_id, note: "called on Monday" });
    const schools = await call<{ used: number; seats: number; admins: string[] }[]>(founder, "admin_schools");
    expect(schools[0]).toMatchObject({ used: 1, seats: 12, admins: [mail[head]] });
  });

  it("a school admin without an account yet is invited; they become admin when they accept", async () => {
    const made = await call<{ admin: string }>(founder, "admin_create_school", {
      school_name: "ახალი სკოლა", city: "ბათუმი", seats: 5, paid_until: null, admin_email: "new.head@school.test", request: null, reason: "invoice 9",
    });
    expect(made.admin).toBe("invited");
    await db.query("insert into auth.users (id, email) values ($1, 'new.head@school.test')", ["e0000000-0000-0000-0000-000000000006"]);
    const [invite] = await call<{ id: string; role: string }[]>("e0000000-0000-0000-0000-000000000006", "my_school_invites");
    expect(invite.role).toBe("admin");
    expect(await call("e0000000-0000-0000-0000-000000000006", "accept_school_invite", { invite: invite.id })).toBe("ok");
    expect(await call("e0000000-0000-0000-0000-000000000006", "school_overview")).toMatchObject({ used: 1 });
  });

  it("changing seats and dates is logged; seats can't drop below the teachers already in", async () => {
    const sid = await makeSchool(3);
    await call(nino, "join_school", { code: await code() });
    expect(await call(founder, "admin_update_school", { school: sid, seats: 1, paid_until: null, new_status: "active", reason: "fewer seats" })).toBe("seatsInUse");
    expect(await call(founder, "admin_update_school", { school: sid, seats: 10, paid_until: null, new_status: "ended", reason: "contract over" })).toBe("ok");
    expect(await planOf(nino)).toBe("free");
    const log = await call<{ action: string }[]>(founder, "admin_log_list");
    expect(log.map((row) => row.action)).toEqual(["school.update", "school.create"]);
  });

  it("overview, users, revenue, failed payments and AI usage add up", async () => {
    await makeSchool();
    await db.query(`insert into public.payments (user_id, order_id, provider, kind, plan, billing_period, amount_tetri, status, paid_at, created_at) values
      ($1, 'mt-c-0000000001', 'mock', 'checkout', 'premium', 'month', 1500, 'paid', now(), now()),
      ($1, 'mt-r-0000000002', 'mock', 'renewal', 'premium', 'month', 1500, 'failed', null, now()),
      ($2, 'mt-c-0000000003', 'mock', 'checkout', 'premium', 'year', 12000, 'refunded', now(), now())`, [nino, giorgi]);
    await db.query("insert into public.ai_usage (user_id, subject, question_count, status, input_tokens, output_tokens) values ($1, 'math', 5, 'done', 100, 900)", [nino]);
    const overview = await call<Record<string, number>>(founder, "admin_overview");
    expect(overview).toMatchObject({ users: 5, schools: 1, seats: 3, seats_used: 1, revenue_month_tetri: 1500, failed_30d: 1, ai_month: 1 });
    const [month] = await call<{ paid_tetri: number; refunded_tetri: number; payments: number; failed: number }[]>(founder, "admin_revenue");
    expect(month).toMatchObject({ paid_tetri: 13500, refunded_tetri: 12000, payments: 2, failed: 1 });
    expect(await call<{ email: string }[]>(founder, "admin_failed_payments")).toMatchObject([{ email: mail[nino] }]);
    const ai = await call<{ months: { generations: number; output_tokens: number }[]; top: { email: string }[] }>(founder, "admin_ai_usage");
    expect(ai.months[0]).toMatchObject({ generations: 1, output_tokens: 900 });
    expect(ai.top).toMatchObject([{ email: mail[nino] }]);
    const users = await call<{ email: string; plan_now: string; school: string | null }[]>(founder, "admin_users", { search: "SCHOOL.test", kind: "all", page: 0 });
    expect(users.map((row) => row.email).sort()).toEqual([mail[giorgi], mail[head], mail[nino]].sort());
    expect(users.find((row) => row.email === mail[head])).toMatchObject({ plan_now: "school", school: "თბილისის 51-ე სკოლა" });
    expect(await call<unknown[]>(founder, "admin_users", { search: "", kind: "school", page: 0 })).toHaveLength(1);
  });
});

it("the migration is safe to apply twice and keeps everything", async () => {
  await makeSchool();
  await call(nino, "join_school", { code: await code() });
  await db.exec(readFileSync("supabase/migrations/20261121_schools.sql", "utf8"));
  expect(await planOf(nino)).toBe("school");
  expect((await call<{ used: number }>(head, "school_overview")).used).toBe(2);
  expect(await call(founder, "am_i_admin")).toBe(true);
});
