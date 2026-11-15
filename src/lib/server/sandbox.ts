import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { plansSql } from "@/lib/plans/plansSql";
import { SUPABASE_STUBS } from "./supabaseStubs";

/**
 * THE SANDBOX: a pretend database for trying payments on your own computer.
 *
 * Start the app with MATHTEST_SANDBOX=1 (`npm run dev:sandbox`) and the
 * billing routes talk to a small Postgres that lives in this server's memory
 * (PGlite), loaded with the real supabase/schema.sql — instead of Supabase.
 * So the whole "buy → webhook → Premium → renewal fails → Free" story runs
 * with the real SQL, and the real Supabase project is never touched.
 *
 * - Everything in it is forgotten when the server stops.
 * - Only the mock payment provider works with it (no real money, ever).
 * - It trusts the sign-in cookie without checking it, which is fine ONLY
 *   because there is no real data in it. Never switch it on for a real site.
 */
export const sandboxEnabled = () => process.env.MATHTEST_SANDBOX === "1";

/** The sandbox's own "server secret" (the real one is BILLING_SERVER_SECRET). */
export const SANDBOX_SECRET = "sandbox-secret-not-for-real-use-000";

type Pg = { exec(sql: string): Promise<unknown>; query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> };
type Sandbox = { db: Pg; run<T>(job: (db: Pg) => Promise<T>): Promise<T> };

// One database per server process, also across hot reloads in `next dev`.
const store = globalThis as { __mathtestSandbox?: Promise<Sandbox> };

async function create(): Promise<Sandbox> {
  // Loaded only when the sandbox is on: PGlite is a development tool.
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite() as unknown as Pg;
  await db.exec(SUPABASE_STUBS);
  await db.exec(readFileSync(path.join(process.cwd(), "supabase", "schema.sql"), "utf8"));
  await db.exec(plansSql());
  await db.query("select public.set_server_secret('billing', $1)", [SANDBOX_SECRET]);
  // One at a time: "set role" belongs to the single connection.
  let last: Promise<unknown> = Promise.resolve();
  const run = <T>(job: (db: Pg) => Promise<T>): Promise<T> => {
    const next = last.then(() => job(db));
    last = next.catch(() => undefined);
    return next;
  };
  return { db, run };
}

export function sandbox(): Promise<Sandbox> {
  return (store.__mathtestSandbox ??= create());
}

/** A sandbox account appears the first time it is seen (with a fresh trial, like a real sign-up). */
export async function sandboxEnsureUser(id: string, email: string | null): Promise<void> {
  const box = await sandbox();
  await box.run((db) => db.query("insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing", [id, email]));
}

/** Calls a database function as the public API would (role anon / authenticated). */
export async function sandboxRpc<T>(fn: string, args: Record<string, unknown>, userId: string | null): Promise<T> {
  if (!/^[a-z_]+$/.test(fn)) throw new Error("bad function name");
  const names = Object.keys(args);
  if (names.some((name) => !/^[a-z_][a-z0-9_]*$/.test(name))) throw new Error("bad argument name");
  const box = await sandbox();
  return box.run(async (db) => {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
    await db.exec(userId ? "set role authenticated" : "set role anon");
    try {
      const list = names.map((name, i) => `${name} => $${i + 1}`).join(", ");
      const { rows } = await db.query<{ result: T }>(`select public.${fn}(${list}) as result`, names.map((name) => args[name]));
      return rows[0]?.result as T;
    } finally {
      await db.exec("reset role");
    }
  });
}

/**
 * "Time travel" for one account: pretend `days` days have passed, by moving
 * its dates into the past. (The real database has nothing like this.)
 */
export async function sandboxSkipDays(userId: string, days: number): Promise<void> {
  const box = await sandbox();
  const gap = `${days} days`;
  await box.run(async (db) => {
    await db.query(
      `update public.subscriptions set
         trial_ends_at = trial_ends_at - $2::interval, current_period_start = current_period_start - $2::interval,
         current_period_end = current_period_end - $2::interval, grace_ends_at = grace_ends_at - $2::interval,
         next_retry_at = next_retry_at - $2::interval
       where user_id = $1`,
      [userId, gap],
    );
    await db.query("update public.payments set created_at = created_at - $2::interval, paid_at = paid_at - $2::interval where user_id = $1", [userId, gap]);
  });
}

/** Start again as a brand-new account (new trial, no payments). */
export async function sandboxResetUser(userId: string): Promise<void> {
  const box = await sandbox();
  await box.run(async (db) => {
    await db.query("delete from public.payments where user_id = $1", [userId]);
    await db.query("delete from auth.users where id = $1", [userId]);
  });
}

/**
 * The sandbox knows nothing about the teaching subjects chosen in Supabase,
 * so it accepts the subject of the request as the account's subject.
 * (The real rule — only the teacher's active subjects — is in the database
 * function ai_consume and tested in src/lib/ai/aiSql.test.ts.)
 */
export async function sandboxAllowSubject(userId: string, subject: string): Promise<void> {
  const box = await sandbox();
  await box.run((db) =>
    db.query("insert into public.teacher_subjects (user_id, subjects) values ($1, array[$2]::text[]) on conflict (user_id) do update set subjects = excluded.subjects", [userId, subject]),
  );
}
