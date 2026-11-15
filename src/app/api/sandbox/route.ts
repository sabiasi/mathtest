/**
 * /api/sandbox — test tools. They exist ONLY when the app runs with the
 * pretend database (MATHTEST_SANDBOX=1, see lib/server/sandbox.ts); on a
 * real site every request here answers 404.
 *
 *   GET                                  → the emails "sent" to you (console adapter)
 *   POST { action: "skipDays", days }    → pretend that many days passed (your account only)
 *   POST { action: "runJob" }            → run the scheduled billing job now (for your account only)
 *   POST { action: "reset" }             → start again as a brand-new account
 */
import { emailOutbox } from "@/lib/email/send";
import { siteOrigin } from "@/lib/payments/config";
import { fromOurSite, readJson } from "@/lib/payments/http";
import { runBillingJob } from "@/lib/payments/service";
import { serverDb } from "@/lib/server/db";
import { sandboxEnabled, sandboxResetUser, sandboxSkipDays } from "@/lib/server/sandbox";

const answer = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  if (!sandboxEnabled()) return answer(404, { error: "not found" });
  const db = await serverDb();
  if (!db?.user) return answer(401, { error: "signIn" });
  const mine = emailOutbox().filter((email) => email.to === db.user!.email);
  return answer(200, { emails: mine.map(({ kind, subject, text, at }) => ({ kind, subject, text, at })) });
}

export async function POST(request: Request) {
  if (!sandboxEnabled()) return answer(404, { error: "not found" });
  if (!fromOurSite(request)) return answer(400, { error: "invalid" });
  const db = await serverDb();
  if (!db?.user) return answer(401, { error: "signIn" });
  const body = await readJson(request);
  if (body?.action === "skipDays") {
    const days = Number(body.days);
    if (!Number.isFinite(days) || days <= 0 || days > 800) return answer(400, { error: "invalid" });
    await sandboxSkipDays(db.user.id, days);
    return answer(200, { ok: true });
  }
  if (body?.action === "runJob") return answer(200, { ok: true, ...(await runBillingJob(db, siteOrigin(request), db.user.id)) });
  if (body?.action === "reset") {
    await sandboxResetUser(db.user.id);
    return answer(200, { ok: true });
  }
  return answer(400, { error: "invalid" });
}
