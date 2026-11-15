// @vitest-environment node
/**
 * The payment rules, tested against the REAL SQL (supabase/schema.sql) in a
 * local Postgres (PGlite). Only Supabase's own infrastructure is stubbed.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { periodEnd } from "@/lib/plans/billing";
import { GRACE_DAYS, RENEWAL_RETRY_DAYS } from "@/lib/plans/plans";
import { plansSql } from "@/lib/plans/plansSql";
import { SUPABASE_STUBS } from "@/lib/server/supabaseStubs";

const db = new PGlite();
const teacher = "10000000-0000-0000-0000-000000000001";
const other = "20000000-0000-0000-0000-000000000002";
const SECRET = "test-secret-that-is-long-enough-123";
const migration = readFileSync("supabase/migrations/20261116_payments.sql", "utf8");

type Json = Record<string, unknown>;

beforeAll(async () => {
  await db.exec(SUPABASE_STUBS);
  await db.exec(readFileSync("supabase/schema.sql", "utf8"));
  await db.exec(plansSql());
  await db.query("select public.set_server_secret('billing', $1)", [SECRET]);
}, 30_000);
afterAll(async () => { await db.close(); });

beforeEach(async () => {
  await db.exec("reset role; truncate auth.users cascade; truncate public.payments, public.payment_events, public.email_log;");
  await db.query("insert into auth.users(id, email) values ($1, 'teacher@example.test'), ($2, 'other@example.test')", [teacher, other]);
});

/** Calls a function the way our server does: through the public API role, with the secret. */
async function call<T = Json>(fn: string, args: unknown[], secret: string | null = SECRET, role = "anon"): Promise<T> {
  await db.exec(`set role ${role}`);
  try {
    const marks = args.map((_, i) => `$${i + 2}`).join(", ");
    const { rows } = await db.query<{ result: T }>(`select public.${fn}($1${marks ? ", " + marks : ""}) as result`, [secret, ...args]);
    return rows[0].result;
  } finally {
    await db.exec("reset role");
  }
}
async function asTeacher<T>(action: () => Promise<T>, id = teacher): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
  try { return await action(); } finally { await db.exec("reset role"); }
}
const sub = async (id = teacher) =>
  (await db.query<Json>("select * from public.subscriptions where user_id = $1", [id])).rows[0];
const planOf = async (id = teacher) => (await db.query<{ p: string }>("select public.plan_of($1) as p", [id])).rows[0].p;
const shift = (days: number, id = teacher) => db.query(
  `update public.subscriptions set trial_ends_at = trial_ends_at - $2::interval, current_period_end = current_period_end - $2::interval,
     grace_ends_at = grace_ends_at - $2::interval, next_retry_at = next_retry_at - $2::interval where user_id = $1`, [id, `${days} days`]);

let counter = 0;
async function checkout(period = "month", amount = 1500, id = teacher) {
  const order = `mt-c-test-${++counter}`;
  const started = await call("billing_start_checkout", [id, "mock", order, period, amount]);
  return { order, started };
}
const event = (type: string, order: string, extra: { id?: string; amount?: number | null; token?: string; reason?: string } = {}) =>
  call("billing_record_event", ["mock", extra.id ?? `evt-${++counter}`, type, order, extra.amount ?? null, "pay-1", "4242", "visa", "12/30", extra.token ?? "tok-ok", extra.reason ?? null, "{}"]);
async function pay(period = "month", amount = 1500) {
  const { order } = await checkout(period, amount);
  await event("payment_succeeded", order, { amount });
  return order;
}
async function renew(outcome: "payment_succeeded" | "payment_failed") {
  const order = `mt-r-test-${++counter}`;
  const started = await call("billing_start_renewal", [teacher, order, 1500]);
  if (started.skip) return started;
  return event(outcome, order, { amount: 1500 });
}

describe("who may change a plan", () => {
  it("a teacher cannot write their plan, payments, card or the audit log", async () => {
    await pay();
    await expect(asTeacher(() => db.exec("update public.subscriptions set plan='school'"))).rejects.toThrow(/permission denied/);
    await expect(asTeacher(() => db.exec("update public.subscriptions set changed_by='me'"))).rejects.toThrow(/permission denied/);
    await expect(asTeacher(() => db.exec("insert into public.payments(order_id,provider,kind,plan,billing_period,amount_tetri) values ('abcdefgh','mock','checkout','premium','month',1)"))).rejects.toThrow(/permission denied/);
    await expect(asTeacher(() => db.exec("update public.payments set status='paid'"))).rejects.toThrow(/permission denied/);
    for (const table of ["payment_customers", "payment_events", "email_log", "server_secrets", "subscription_changes"]) {
      await expect(asTeacher(() => db.exec(`select * from public.${table}`)), table).rejects.toThrow(/permission denied/);
    }
    // Their own receipts are readable; another teacher's are not.
    expect((await asTeacher(() => db.query("select * from public.payments"))).rows).toHaveLength(1);
    expect((await asTeacher(() => db.query("select * from public.payments"), other)).rows).toHaveLength(0);
  });

  it("every billing function refuses a missing or wrong secret", async () => {
    const { order } = await checkout();
    const attempts: [string, unknown[]][] = [
      ["billing_start_checkout", [teacher, "mock", "mt-c-another-1", "month", 1500]],
      ["billing_start_renewal", [teacher, "mt-r-another-1", 1500]],
      ["billing_record_event", ["mock", "evt-x", "payment_succeeded", order]],
      ["billing_set_cancel", [teacher, true]],
      ["billing_set_period", [teacher, "year"]],
      ["billing_sweep", []],
      ["email_claim", [teacher, "welcome", "k"]],
      ["email_release", ["k"]],
      ["billing_summary", [teacher]],
    ];
    for (const [fn, args] of attempts) {
      for (const secret of ["wrong-secret-wrong-secret-wrong", null, ""]) {
        await expect(call(fn, args, secret, "authenticated"), `${fn} with ${secret}`).rejects.toThrow(/Not allowed/);
      }
    }
    expect((await sub()).status).toBe("trialing");
    // The helpers behind them can't be called at all, and the secret can't be replaced.
    await expect(asTeacher(() => db.exec("select public.set_server_secret('billing', 'my-own-secret-my-own-secret-1')"))).rejects.toThrow(/permission denied/);
    await expect(asTeacher(() => db.exec("select public.billing_payment_info(gen_random_uuid())"))).rejects.toThrow(/permission denied/);
    await expect(asTeacher(() => db.exec("select public.billing_period_end(now(), 'year')"))).rejects.toThrow(/permission denied/);
  });
});

describe("paying", () => {
  it("trial → paid: Premium is active for one period and a receipt is written", async () => {
    const { order, started } = await checkout();
    expect(started.payment_id).toBeTruthy();
    expect((await sub()).status).toBe("trialing");
    const result = await event("payment_succeeded", order, { amount: 1500 });
    expect(result).toMatchObject({ result: "paid", kind: "checkout", email: "teacher@example.test", language: "ka", amount_tetri: 1500 });
    expect(result.receipt_number).toBeGreaterThan(0);
    const row = await sub();
    expect(row).toMatchObject({ plan: "premium", status: "active", billing_period: "month", provider: "mock", changed_by: "webhook:mock", cancel_at_period_end: false });
    expect(await planOf()).toBe("premium");
    const summary = await call("billing_summary", [teacher]);
    expect(summary.method).toEqual({ last4: "4242", brand: "visa", expiry: "12/30" });
    expect(summary.payments).toHaveLength(1);
    expect(JSON.stringify(summary)).not.toContain("tok-ok"); // the card token never leaves the database
  });

  it("the same webhook twice is processed once (idempotent)", async () => {
    const { order } = await checkout();
    const first = await event("payment_succeeded", order, { id: "evt-same", amount: 1500 });
    const end = (await sub()).current_period_end;
    const second = await event("payment_succeeded", order, { id: "evt-same", amount: 1500 });
    const third = await event("payment_succeeded", order, { id: "evt-other-id", amount: 1500 });
    expect([first.result, second.result, third.result]).toEqual(["paid", "duplicate", "alreadyPaid"]);
    expect((await sub()).current_period_end).toEqual(end);
    expect((await db.query("select * from public.payment_events")).rows).toHaveLength(2);
    expect((await db.query("select * from public.payments where status='paid'")).rows).toHaveLength(1);
  });

  it("a wrong amount, an unknown order or a declined card never gives a plan", async () => {
    const { order } = await checkout();
    expect((await event("payment_succeeded", order, { amount: 1 })).result).toBe("amountMismatch");
    expect((await event("payment_succeeded", "mt-c-nobody-knows")).result).toBe("unknownOrder");
    expect((await event("payment_failed", order, { reason: "card_declined" })).result).toBe("failed");
    expect((await sub()).status).toBe("trialing");
    // The bank page lets the teacher try another card on the same order.
    expect((await event("payment_succeeded", order, { amount: 1500 })).result).toBe("paid");
    expect(await planOf()).toBe("premium");
  });

  it("buying while already subscribed is refused; after cancelling, new time is added on top", async () => {
    await pay();
    expect((await checkout()).started).toEqual({ error: "alreadySubscribed" });
    const firstEnd = (await sub()).current_period_end as Date;
    await call("billing_set_cancel", [teacher, true]);
    await pay("year", 12000);
    const row = await sub();
    expect(row).toMatchObject({ status: "active", billing_period: "year", cancel_at_period_end: false });
    expect((row.current_period_end as Date).getTime()).toBe(periodEnd(firstEnd, "year").getTime());
  });

  it("period ends match the app's rule (billing.ts)", async () => {
    const starts = ["2026-01-31T10:00:00Z", "2026-11-15T08:00:00Z", "2026-06-30T19:59:00Z", "2026-06-30T20:00:00Z", "2027-07-01T00:00:00Z", "2028-02-29T12:00:00Z"];
    for (const start of starts) for (const period of ["month", "year", "schoolYear"] as const) {
      const { rows } = await db.query<{ e: Date }>("select public.billing_period_end($1::timestamptz, $2) as e", [start, period]);
      expect(rows[0].e.toISOString(), `${start} ${period}`).toBe(periodEnd(new Date(start), period).toISOString());
    }
  });
});

describe("renewals, retries, grace", () => {
  it("a renewal is charged only when due, and extends the plan without a gap", async () => {
    await pay();
    expect(await renew("payment_succeeded")).toEqual({ skip: true });
    const end = (await sub()).current_period_end as Date;
    await shift(31);
    const shifted = (await sub()).current_period_end as Date;
    expect((await call("billing_sweep", [])).charges).toEqual([{ user_id: teacher, provider: "mock", plan: "premium", period: "month" }]);
    expect((await renew("payment_succeeded")).result).toBe("paid");
    const row = await sub();
    expect(row).toMatchObject({ status: "active", renewal_attempts: 0 });
    expect((row.current_period_end as Date).getTime()).toBe(periodEnd(shifted, "month").getTime());
    expect(end.getTime()).toBeGreaterThan(shifted.getTime());
    expect((await call("billing_sweep", [])).charges).toEqual([]);
  });

  it("failed renewal → retries on days 1, 3, 5 → grace → Free; nothing is deleted", async () => {
    await db.query("insert into public.tests(user_id,id,data) values ($1,'kept','{}')", [teacher]);
    await pay();
    await shift(30.5);
    const days = (row: Json) => Math.round(((row.next_retry_at as Date).getTime() - (row.current_period_end as Date).getTime()) / 86_400_000);
    const failed = await renew("payment_failed");
    expect(failed).toMatchObject({ result: "failed", kind: "renewal", retries_left: true });
    let row = await sub();
    expect(row).toMatchObject({ status: "past_due", renewal_attempts: 1 });
    expect(days(row)).toBe(RENEWAL_RETRY_DAYS[0]);
    expect(Math.round(((row.grace_ends_at as Date).getTime() - (row.current_period_end as Date).getTime()) / 86_400_000)).toBe(GRACE_DAYS);
    expect(await planOf()).toBe("premium"); // grace: still Premium
    expect(await renew("payment_failed")).toEqual({ skip: true }); // not yet time for the retry

    for (const [index, wait] of [[1, 1], [2, 2]] as const) {
      await shift(wait);
      expect((await call("billing_sweep", [])).charges).toHaveLength(1);
      expect((await renew("payment_failed")).result).toBe("failed");
      row = await sub();
      expect(row.renewal_attempts).toBe(index + 1);
      expect(days(row)).toBe(RENEWAL_RETRY_DAYS[index]);
    }
    await shift(2);
    expect((await renew("payment_failed")).result).toBe("failed");
    row = await sub();
    expect(row).toMatchObject({ renewal_attempts: 4, next_retry_at: null });
    expect(await planOf()).toBe("premium");

    await shift(2); // day 7.5: grace is over
    const swept = await call<{ charges: Json[]; emails: Json[] }>("billing_sweep", []);
    expect(swept.charges).toEqual([]);
    expect(swept.emails).toMatchObject([{ kind: "planEnded", user_id: teacher, email: "teacher@example.test" }]);
    expect(await sub()).toMatchObject({ status: "expired", plan: "premium", changed_by: "cron", changed_reason: "grace period over" });
    expect(await planOf()).toBe("free");
    expect((await db.query("select * from public.tests")).rows).toHaveLength(1);
    expect((await call("billing_sweep", [])).emails).toEqual([]);
  });

  it("a retry that succeeds ends the grace period", async () => {
    await pay();
    await shift(30.5);
    await renew("payment_failed");
    await shift(1);
    expect((await renew("payment_succeeded")).result).toBe("paid");
    expect(await sub()).toMatchObject({ status: "active", renewal_attempts: 0, grace_ends_at: null, next_retry_at: null });
  });

  it("two jobs at once cannot charge the same renewal twice; a lost answer counts as failed", async () => {
    await pay();
    await shift(31);
    expect((await call("billing_start_renewal", [teacher, "mt-r-first-01", 1500])).card_token).toBe("tok-ok");
    expect(await call("billing_start_renewal", [teacher, "mt-r-second-1", 1500])).toEqual({ skip: true });
    expect((await call("billing_sweep", [])).charges).toEqual([]);
    await db.exec("update public.payments set created_at = now() - interval '7 hours' where status = 'pending'");
    await call("billing_sweep", []);
    expect(await sub()).toMatchObject({ status: "past_due", renewal_attempts: 1 });
  });
});

describe("cancel, resume, change period, refund", () => {
  it("cancel keeps the plan until the period ends; resume before that undoes it", async () => {
    expect(await call("billing_set_cancel", [teacher, true])).toEqual({ error: "noSubscription" }); // a trial can't be cancelled
    await pay();
    const cancelled = await call("billing_set_cancel", [teacher, true]);
    expect(cancelled).toMatchObject({ ok: true, email: "teacher@example.test" });
    expect(await sub()).toMatchObject({ cancel_at_period_end: true, changed_by: "user", status: "active" });
    expect(await planOf()).toBe("premium");
    expect((await call("billing_set_cancel", [teacher, false])).ok).toBe(true);
    expect((await sub()).cancel_at_period_end).toBe(false);

    await call("billing_set_cancel", [teacher, true]);
    await shift(31);
    expect(await planOf()).toBe("free");
    expect(await call("billing_set_cancel", [teacher, false])).toEqual({ error: "ended" });
    const swept = await call<{ charges: Json[]; emails: Json[] }>("billing_sweep", []);
    expect(swept.charges).toEqual([]); // a cancelled plan is never charged
    expect(swept.emails).toMatchObject([{ kind: "planEnded" }]);
    expect((await sub()).status).toBe("expired");
  });

  it("changing the period applies from the next renewal", async () => {
    await pay();
    const end = (await sub()).current_period_end;
    expect((await call("billing_set_period", [teacher, "year"])).ok).toBe(true);
    expect(await call("billing_set_period", [teacher, "weekly"])).toEqual({ error: "invalid" });
    expect(await call("billing_set_period", [other, "year"])).toEqual({ error: "noSubscription" });
    expect(await sub()).toMatchObject({ billing_period: "year", current_period_end: end });
    await shift(31);
    expect((await call("billing_sweep", [])).charges).toMatchObject([{ period: "year" }]);
  });

  it("a refund ends the plan it paid for and keeps everything else", async () => {
    const order = await pay();
    expect((await event("refunded", order)).result).toBe("refunded");
    expect(await sub()).toMatchObject({ status: "expired", changed_reason: "payment refunded" });
    expect(await planOf()).toBe("free");
    expect((await event("refunded", order)).result).toBe("ignored");
    expect((await db.query<Json>("select status from public.payments")).rows[0].status).toBe("refunded");
  });

  it("the audit log records who changed the plan and why", async () => {
    await pay();
    await call("billing_set_cancel", [teacher, true]);
    await db.query("update public.subscriptions set plan='school' where user_id=$1", [teacher]); // e.g. by hand in the SQL editor
    const { rows } = await db.query<{ changed_by: string; reason: string }>("select changed_by, reason from public.subscription_changes where user_id=$1 order by id", [teacher]);
    expect(rows.map((r) => `${r.changed_by}: ${r.reason}`)).toEqual([
      "system: ", "webhook:mock: payment received", "user: cancelled by the teacher", "system: ",
    ]);
  });
});

describe("reminders and emails", () => {
  it("trial reminders 3 days and 1 day before the end", async () => {
    const kinds = async () => (await call<{ emails: Json[] }>("billing_sweep", [])).emails.filter((e) => e.user_id === teacher).map((e) => e.kind);
    expect(await kinds()).toEqual([]);
    await shift(11.5);
    expect(await kinds()).toEqual(["trialEnding3"]);
    await shift(2);
    expect(await kinds()).toEqual(["trialEnding1"]);
    await shift(1);
    expect(await kinds()).toEqual([]);
    expect(await planOf()).toBe("free");
  });

  it("an email key can be claimed once", async () => {
    expect(await call("email_claim", [teacher, "welcome", `${teacher}:welcome`])).toBe(true);
    expect(await call("email_claim", [teacher, "welcome", `${teacher}:welcome`])).toBe(false);
    expect(await call("email_release", [`${teacher}:welcome`])).toBe(true);
    expect(await call("email_claim", [teacher, "welcome", `${teacher}:welcome`])).toBe(true);
  });
});

describe("the migration", () => {
  it("is safe to apply twice and keeps existing payments", async () => {
    await pay();
    await db.exec(migration);
    await db.exec(migration);
    expect(await planOf()).toBe("premium");
    expect((await db.query("select * from public.payments")).rows).toHaveLength(1);
    // The secret set before is still the one that works.
    expect((await call("billing_summary", [teacher])).payments).toHaveLength(1);
  });
});
