// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { SUBJECT_IDS } from "@/subjects/ids";
import { plansSql } from "@/lib/plans/plansSql";

const db = new PGlite();
const teacher = "10000000-0000-0000-0000-000000000001";
const other = "20000000-0000-0000-0000-000000000002";
const migration = readFileSync("supabase/migrations/20261114_teaching_subjects.sql", "utf8");
const previewMigration = readFileSync("supabase/migrations/20261115_plan_preview.sql", "utf8");

beforeAll(async () => {
  // Only Supabase's infrastructure is stubbed; the actual app SQL and RLS run in Postgres.
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, metadata jsonb, created_at timestamptz default now());
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1, '/') $$;
    grant usage on schema public, auth, storage to anon, authenticated;
    grant select, insert, update, delete on storage.objects to authenticated;
  `);
  await db.exec(readFileSync("supabase/schema.sql", "utf8"));
  await db.exec(plansSql());
}, 30_000);

afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec("reset role; truncate auth.users cascade; truncate storage.objects;");
  await db.query("insert into auth.users(id) values ($1), ($2)", [teacher, other]);
  await db.exec("update public.subscriptions set plan = 'free', status = 'expired'");
});

async function asTeacher<T>(action: () => Promise<T>, id = teacher): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
  try { return await action(); } finally { await db.exec("reset role"); }
}
const choose = (subjects: string[], preferred = subjects[0]) => asTeacher(() =>
  db.query("select public.set_teaching_subjects($1::text[], $2)", [subjects, preferred]));
const insert = (id: string, subject: string, owner = teacher) => db.query(
  "insert into public.tests(user_id,id,data) values ($1,$2,$3::jsonb)", [owner, id, JSON.stringify({ id, subjectId: subject, title: "Original" })]);
const plan = (name: string) => db.query("update public.subscriptions set plan=$1, status='active', current_period_end=null where user_id=$2", [name, teacher]);

describe("teaching subject database enforcement", () => {
  it("requires explicit onboarding even for an existing default subject", async () => {
    await db.query("update public.profiles set default_subject='math' where id=$1", [teacher]);
    await expect(asTeacher(() => insert("blocked", "math"))).rejects.toThrow(/row-level security/);
    await choose(["math"]);
    await asTeacher(() => insert("allowed", "math"));
    expect((await db.query("select * from public.tests")).rows).toHaveLength(1);
  });

  it("Free permits one subject and blocks switching, invalid choices, and extra roles", async () => {
    await expect(choose(["math", "physics"])).rejects.toThrow(/Premium/);
    await expect(choose(["administrator"])).rejects.toThrow(/Invalid/);
    await choose(["math"]);
    await expect(choose(["physics"])).rejects.toThrow(/cannot be switched/);
    await expect(choose(["math"], "physics")).rejects.toThrow(/Invalid/);
    await expect(asTeacher(() => insert("wrong", "physics"))).rejects.toThrow(/row-level security/);
  });

  it("direct assignment writes, plan spoofing, and cross-account writes fail", async () => {
    await choose(["math"]);
    await expect(asTeacher(() => db.exec("update public.teacher_subjects set subjects=array['math','physics']"))).rejects.toThrow(/permission denied/);
    await expect(asTeacher(() => db.exec("delete from public.teacher_subjects"))).rejects.toThrow(/permission denied/);
    await expect(asTeacher(() => db.exec("update public.subscriptions set plan='premium'"))).rejects.toThrow(/permission denied/);
    await expect(asTeacher(() => insert("other", "math", other))).rejects.toThrow(/row-level security/);
    await expect(asTeacher(() => db.query("select public.may_teach_subject($1, 'math')", [other]))).rejects.toThrow(/permission denied/);
  });

  it.each(["premium", "school"])("%s can assign multiple subjects and update only allowed tests", async (name) => {
    await plan(name);
    await choose(["math", "physics"], "physics");
    await asTeacher(() => insert("m", "math"));
    await asTeacher(() => insert("p", "physics"));
    await asTeacher(() => db.exec(`update public.tests set data=jsonb_set(data,'{subjectId}','"physics"') where id='m'`));
    await expect(asTeacher(() => insert("c", "chemistry"))).rejects.toThrow(/row-level security/);
    await expect(choose(["math", "math"])).rejects.toThrow(/Invalid/);
    expect((await db.query<{ default_subject: string }>("select default_subject from public.profiles where id=$1", [teacher])).rows[0].default_subject).toBe("physics");
  });

  it("expiry requires choosing one previous subject and keeps other tests and pictures readable", async () => {
    await plan("premium");
    await choose(["math", "physics"]);
    await asTeacher(() => insert("m", "math"));
    await asTeacher(() => insert("p", "physics"));
    await db.query("insert into storage.objects(bucket_id,name) values ('images',$1)", [`${teacher}/old-picture`]);
    await db.query("update public.subscriptions set status='expired' where user_id=$1", [teacher]);
    await expect(asTeacher(() => insert("new", "math"))).rejects.toThrow(/row-level security/);
    await expect(choose(["biology"])).rejects.toThrow(/cannot be switched/);
    await choose(["math"]);
    await asTeacher(() => insert("new", "math"));
    await asTeacher(() => db.exec(`update public.tests set title='Unauthorized' where id='p'`));
    await asTeacher(() => db.exec(`update public.tests set data=jsonb_set(data,'{subjectId}','"math"') where id='p'`));
    const old = await asTeacher(() => db.query<{ title: string; data: { subjectId: string } }>("select title,data from public.tests where id='p'"));
    expect(old.rows[0]).toMatchObject({ title: "", data: { subjectId: "physics" } });
    expect((await asTeacher(() => db.query("select * from storage.objects"))).rows).toHaveLength(1);
    expect((await asTeacher(() => db.query("select * from public.tests"), other)).rows).toHaveLength(0);
  });

  it("cannot convert an allowed test into an unauthorized subject", async () => {
    await choose(["math"]);
    await asTeacher(() => insert("m", "math"));
    await expect(asTeacher(() => db.exec(`update public.tests set data=jsonb_set(data,'{subjectId}','"physics"') where id='m'`))).rejects.toThrow(/row-level security/);
  });

  it("trial and grace periods use the existing subscription rules", async () => {
    await db.query("update public.subscriptions set status='trialing', trial_ends_at=now()+interval '1 day' where user_id=$1", [teacher]);
    await choose(["math", "biology"]);
    await db.query("update public.subscriptions set trial_ends_at=now()-interval '1 second' where user_id=$1", [teacher]);
    await expect(asTeacher(() => insert("expired-trial", "biology"))).rejects.toThrow(/row-level security/);
    await db.query("update public.subscriptions set plan='premium',status='past_due',current_period_end=now()-interval '1 day',grace_ends_at=now()+interval '1 day' where user_id=$1", [teacher]);
    await asTeacher(() => insert("grace", "biology"));
    await db.query("update public.subscriptions set grace_ends_at=now()-interval '1 second' where user_id=$1", [teacher]);
    await expect(asTeacher(() => insert("expired-grace", "biology"))).rejects.toThrow(/row-level security/);
  });

  it("default subject preferences cannot grant additional access", async () => {
    await choose(["math"]);
    await expect(asTeacher(() => db.exec("update public.profiles set default_subject='physics'"))).rejects.toThrow(/active teaching subject/);
    await asTeacher(() => db.exec("update public.profiles set school_name='School'"));
  });

  it("upgrades legacy tests without deleting them, and is safe to apply twice", async () => {
    await insert("legacy", "physics");
    await db.exec(migration);
    await db.exec(migration);
    expect((await asTeacher(() => db.query("select * from public.tests"))).rows).toHaveLength(1);
    await choose(["physics"]);
    await asTeacher(() => db.exec("update public.tests set title='Updated' where id='legacy'"));
    expect((await db.query<{ title: string }>("select title from public.tests")).rows[0].title).toBe("Updated");
  });

  it("recognizes legacy Georgian/English subject names like the app", async () => {
    for (const subject of SUBJECT_IDS) for (const language of ["ka", "en"] as const) {
      const { rows } = await db.query<{ subject: string }>("select public.test_teaching_subject($1::jsonb) as subject", [JSON.stringify({ subject: dictionaries[language][`subject.${subject}`] })]);
      expect(rows[0].subject, `${language} ${subject}`).toBe(subject);
    }
  });

  it("prevents changing read-only tests through their stored pictures", async () => {
    await insert("readonly", "physics");
    await db.exec(`update public.tests set data = data || '{"questions":[{"images":[{"imageId":"picture"}]}]}'::jsonb`);
    await db.query("insert into storage.objects(bucket_id,name,metadata) values ('images',$1,'{}')", [`${teacher}/picture`]);
    await choose(["math"]);
    await asTeacher(() => db.exec("update storage.objects set metadata='{\"changed\":true}'"));
    await asTeacher(() => db.exec("delete from storage.objects"));
    expect((await asTeacher(() => db.query<{ metadata: object }>("select metadata from storage.objects"))).rows).toEqual([{ metadata: {} }]);
  });

  it("keeps the standalone migration and fresh-install schema aligned", () => {
    const schema = readFileSync("supabase/schema.sql", "utf8");
    expect(schema.endsWith(migration + previewMigration)).toBe(true);
  });

  it("plan preview: Free applies while it is on, subjects come back when it is off", async () => {
    await plan("premium");
    await choose(["math", "physics"], "physics");
    const preview = (free: boolean) => asTeacher(() => db.query("select public.set_plan_preview($1)", [free]));
    await preview(true);
    expect((await asTeacher(() => db.query<{ p: string }>("select public.my_plan() as p"))).rows[0].p).toBe("free");
    // Free rules now: multiple stored subjects mean "choose one", nothing is editable until then.
    await expect(asTeacher(() => insert("m", "math"))).rejects.toThrow(/row-level security/);
    await expect(choose(["math", "physics"])).rejects.toThrow(/Premium/);
    await choose(["math"]);
    await asTeacher(() => insert("m", "math"));
    await expect(asTeacher(() => insert("p", "physics"))).rejects.toThrow(/row-level security/);
    await preview(false);
    expect((await asTeacher(() => db.query<{ p: string }>("select public.my_plan() as p"))).rows[0].p).toBe("premium");
    expect((await db.query<{ subjects: string[] }>("select subjects from public.teacher_subjects where user_id=$1", [teacher])).rows[0].subjects).toEqual(["math", "physics"]);
    await asTeacher(() => insert("p", "physics"));
    expect((await db.query("select * from public.tests")).rows).toHaveLength(2);
  });

  it("plan preview can never raise a plan, and is safe to repeat or apply twice", async () => {
    await db.exec(previewMigration);
    await choose(["math"]);
    const preview = (free: boolean) => asTeacher(() => db.query("select public.set_plan_preview($1)", [free]));
    await preview(false);
    await preview(true);
    await preview(true);
    await preview(false);
    expect((await asTeacher(() => db.query<{ p: string }>("select public.my_plan() as p"))).rows[0].p).toBe("free");
    await expect(asTeacher(() => db.exec("update public.subscriptions set preview_free=false, preview_subjects=array['math','physics']"))).rejects.toThrow(/permission denied/);
    await db.exec("set role anon");
    try { await expect(db.exec("select public.set_plan_preview(true)")).rejects.toThrow(/permission denied/); }
    finally { await db.exec("reset role"); }
  });

  it("does not expose subject selection to anonymous callers", async () => {
    await db.exec("set role anon");
    try { await expect(db.exec("select public.set_teaching_subjects(array['math'],'math')")).rejects.toThrow(/permission denied/); }
    finally { await db.exec("reset role"); }
  });
});
