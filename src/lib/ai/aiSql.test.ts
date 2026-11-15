// @vitest-environment node
/** The AI limits, tested against the REAL SQL (supabase/schema.sql) in a local Postgres (PGlite). */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PLANS } from "@/lib/plans/plans";
import { plansSql } from "@/lib/plans/plansSql";
import { SUPABASE_STUBS } from "@/lib/server/supabaseStubs";

const db = new PGlite();
const teacher = "10000000-0000-0000-0000-000000000001";
const other = "20000000-0000-0000-0000-000000000002";
const SECRET = "test-secret-that-is-long-enough-123";
type Json = Record<string, unknown>;

beforeAll(async () => {
  await db.exec(SUPABASE_STUBS);
  await db.exec(readFileSync("supabase/schema.sql", "utf8"));
  await db.exec(plansSql());
  await db.query("select public.set_server_secret('billing', $1)", [SECRET]);
}, 30_000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec("reset role; truncate auth.users cascade;");
  await db.query("insert into auth.users(id) values ($1), ($2)", [teacher, other]);
  await setPlan("free");
  await db.query("insert into public.teacher_subjects(user_id, subjects) values ($1, array['math']), ($2, array['math'])", [teacher, other]);
});

const setPlan = (plan: string, id = teacher) => plan === "free"
  ? db.query("update public.subscriptions set plan='free', status='expired' where user_id=$1", [id])
  : db.query("update public.subscriptions set plan=$2, status='active', current_period_end=null where user_id=$1", [id, plan]);
async function call<T = Json>(fn: string, args: unknown[], secret: string | null = SECRET, role = "authenticated"): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [teacher]);
  await db.exec(`set role ${role}`);
  try {
    const marks = args.map((_, i) => `, $${i + 2}`).join("");
    return (await db.query<{ result: T }>(`select public.${fn}($1${marks}) as result`, [secret, ...args])).rows[0].result;
  } finally { await db.exec("reset role"); }
}
const consume = (id = teacher, subject = "math") => call("ai_consume", [id, subject, 5, true, "mock"]);
async function generate(id = teacher) {
  const started = await consume(id);
  if (started.ok) await call("ai_finish", [started.usage_id, true, 100, 200, 5]);
  return started;
}

describe("AI generations per month", () => {
  it.each(["free", "premium", "school"] as const)("%s gets exactly its plan's number", async (plan) => {
    await setPlan(plan);
    const limit = PLANS[plan].limits.aiGenerationsPerMonth;
    expect(await call("ai_status", [teacher])).toEqual({ plan, limit, used: 0 });
    // Fill up to one before the limit in one go, then check the edge by hand.
    await db.query("insert into public.ai_usage(user_id, subject, question_count, status) select $1, 'math', 5, 'done' from generate_series(1, $2::int)", [teacher, limit - 1]);
    expect(await generate()).toMatchObject({ ok: true, used: limit, limit });
    expect(await generate()).toMatchObject({ error: "limit", used: limit, limit });
    expect((await db.query("select * from public.ai_usage where user_id=$1", [teacher])).rows).toHaveLength(limit);
    // Another teacher has their own count.
    expect((await generate(other)).ok).toBe(true);
  });

  it("the trial counts as Premium; when it ends the Free number applies", async () => {
    await db.query("update public.subscriptions set plan='premium', status='trialing', trial_ends_at=now()+interval '1 day' where user_id=$1", [teacher]);
    await db.query("insert into public.ai_usage(user_id, subject, question_count, status) select $1, 'math', 5, 'done' from generate_series(1, 10)", [teacher]);
    expect((await generate()).ok).toBe(true);
    await db.query("update public.subscriptions set trial_ends_at=now()-interval '1 second' where user_id=$1", [teacher]);
    expect(await generate()).toMatchObject({ error: "limit", plan: "free", limit: PLANS.free.limits.aiGenerationsPerMonth });
  });

  it("a failed generation is given back; last month doesn't count", async () => {
    for (let i = 0; i < 5; i++) {
      const started = await consume();
      expect(started.ok, `try ${i}`).toBe(true);
      expect(await call("ai_finish", [started.usage_id, false])).toMatchObject({ used: 0 });
    }
    await db.query("insert into public.ai_usage(user_id, subject, question_count, status, created_at) select $1, 'math', 5, 'done', now() - interval '40 days' from generate_series(1, 9)", [teacher]);
    expect(await call("ai_status", [teacher])).toMatchObject({ used: 0 });
    // A row can be finished only once (a late "it failed" can't refund a finished one).
    const done = await generate();
    expect(await call("ai_finish", [done.usage_id, false])).toEqual({ error: "unknown" });
    expect(await call("ai_status", [teacher])).toMatchObject({ used: 1 });
  });

  it("only the teacher's active teaching subjects", async () => {
    expect(await consume(teacher, "physics")).toMatchObject({ error: "subject" });
    await db.query("delete from public.teacher_subjects where user_id=$1", [teacher]);
    expect(await consume(teacher, "math")).toMatchObject({ error: "subject" }); // not chosen yet
    expect((await db.query("select * from public.ai_usage")).rows).toHaveLength(0);
  });

  it("regenerating one question is free, at most 5 times, for one's own generation only", async () => {
    const done = await generate();
    for (let i = 0; i < 5; i++) expect(await call("ai_regenerate", [teacher, done.usage_id])).toEqual({ ok: true });
    expect(await call("ai_regenerate", [teacher, done.usage_id])).toEqual({ error: "regenerations" });
    const theirs = await generate(other);
    expect(await call("ai_regenerate", [teacher, theirs.usage_id])).toEqual({ error: "regenerations" });
    expect(await call("ai_status", [teacher])).toMatchObject({ used: 1 });
  });

  it("a teacher cannot change, reset or fake their usage", async () => {
    await generate();
    const asTeacher = async (sql: string) => {
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [teacher]);
      await db.exec("set role authenticated");
      try { return await db.query(sql); } finally { await db.exec("reset role"); }
    };
    for (const sql of ["delete from public.ai_usage", "update public.ai_usage set status='failed'", "insert into public.ai_usage(user_id, subject, question_count) values (auth.uid(), 'math', 1)", "select public.ai_usage_of(auth.uid())"]) {
      await expect(asTeacher(sql), sql).rejects.toThrow(/permission denied/);
    }
    for (const [fn, args] of [["ai_consume", [teacher, "math", 5, true, "m"]], ["ai_finish", [1, false]], ["ai_regenerate", [teacher, 1]], ["ai_status", [teacher]]] as const) {
      await expect(call(fn, [...args], "wrong-secret-wrong-secret-wrong"), fn).rejects.toThrow(/Not allowed/);
      await expect(call(fn, [...args], null, "anon"), fn).rejects.toThrow(/Not allowed/);
    }
    // They can read their own rows (no question text exists to read), not other teachers'.
    expect((await asTeacher("select * from public.ai_usage")).rows).toHaveLength(1);
    await generate(other);
    expect((await asTeacher("select * from public.ai_usage")).rows).toHaveLength(1);
    const columns = (await db.query<{ column_name: string }>("select column_name from information_schema.columns where table_name='ai_usage'")).rows.map((r) => r.column_name);
    expect(columns.some((name) => /text|content|prompt|topic/.test(name))).toBe(false);
  });

  it("the migration is safe to apply twice", async () => {
    await generate();
    const sql = readFileSync("supabase/migrations/20261117_ai_usage.sql", "utf8");
    await db.exec(sql); await db.exec(sql);
    expect(await call("ai_status", [teacher])).toMatchObject({ used: 1 });
  });
});
