// @vitest-environment node
/** Premium features' database rules (stage 4), tested against the REAL SQL in a local Postgres (PGlite). */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { plansSql } from "@/lib/plans/plansSql";
import { SUPABASE_STUBS } from "@/lib/server/supabaseStubs";

export const db = new PGlite();
export const teacher = "10000000-0000-0000-0000-000000000001";
export const other = "20000000-0000-0000-0000-000000000002";
export const third = "30000000-0000-0000-0000-000000000003";

beforeAll(async () => {
  await db.exec(SUPABASE_STUBS);
  await db.exec(readFileSync("supabase/schema.sql", "utf8"));
  await db.exec(plansSql());
}, 30_000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec("reset role; truncate auth.users cascade;");
  await db.query("insert into auth.users(id, email) values ($1, 'teacher@example.test'), ($2, 'other@example.test'), ($3, 'third@example.test')", [teacher, other, third]);
  for (const id of [teacher, other, third]) await setPlan("free", id);
});

export const setPlan = (plan: string, id = teacher) => plan === "free"
  ? db.query("update public.subscriptions set plan='free', status='expired' where user_id=$1", [id])
  : db.query("update public.subscriptions set plan=$2, status='active', current_period_end=null where user_id=$1", [id, plan]);
export async function as<T>(id: string | null, action: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ""]);
  await db.exec(id ? "set role authenticated" : "set role anon");
  try { return await action(); } finally { await db.exec("reset role"); }
}

describe("custom paper header", () => {
  const header = JSON.stringify({ enabled: true, schoolName: "School" });
  const save = (id = teacher) => as(id, () => db.query("update public.profiles set paper_header=$1::jsonb where id=$2", [header, id]));

  it("only a plan with the feature may change it; other profile fields stay free to edit", async () => {
    await expect(save()).rejects.toThrow(/Premium required/);
    await as(teacher, () => db.exec("update public.profiles set school_name='Any school'"));
    await setPlan("premium");
    await save();
    await setPlan("school");
    await save();
  });

  it("a saved header is kept when the plan ends, can be cleared, but not changed", async () => {
    await setPlan("premium");
    await save();
    await setPlan("free");
    expect((await as(teacher, () => db.query<{ paper_header: unknown }>("select paper_header from public.profiles"))).rows[0].paper_header).toEqual(JSON.parse(header));
    await as(teacher, () => db.exec("update public.profiles set full_name='New name'")); // unrelated edits still work
    await expect(as(teacher, () => db.exec(`update public.profiles set paper_header='{"enabled":true,"schoolName":"Other"}'`))).rejects.toThrow(/Premium required/);
    await as(teacher, () => db.exec("update public.profiles set paper_header=null"));
  });

  it("nobody can touch another teacher's header, and the plan check can't be called with someone else's id", async () => {
    await setPlan("premium");
    await setPlan("premium", other);
    await save(other);
    await as(teacher, () => db.exec(`update public.profiles set paper_header='{"enabled":false}'`));
    expect((await db.query<{ paper_header: { schoolName?: string } }>("select paper_header from public.profiles where id=$1", [other])).rows[0].paper_header.schoolName).toBe("School");
    await expect(as(teacher, () => db.query("select public.plan_has_feature($1, 'customHeader')", [other]))).rejects.toThrow(/permission denied/);
    expect((await as(teacher, () => db.query<{ f: boolean }>("select public.my_feature('customHeader') as f"))).rows[0].f).toBe(true);
    await expect(as(null, () => db.query("select public.my_feature('customHeader')"))).rejects.toThrow(/permission denied/);
  });

  it("the migration is safe to apply twice", async () => {
    await setPlan("premium");
    await save();
    const sql = readFileSync("supabase/migrations/20261118_custom_header.sql", "utf8");
    await db.exec(sql); await db.exec(sql);
    expect((await db.query("select 1 from public.profiles where paper_header is not null")).rows).toHaveLength(1);
  });
});
