/**
 * GET /auth/callback — where Supabase sends people back to:
 * - after clicking "confirm your email"        (?flow=signup&code=…)
 * - after clicking "reset your password"        (?flow=recovery&next=/reset-password&code=…)
 * - after choosing an account on Google's page  (?next=…&code=…)
 *
 * The `code` is swapped for a real sign-in (stored in cookies), then we
 * redirect to the page the teacher wanted. If anything is wrong (expired
 * link, opened in another browser…) we show a friendly message instead.
 */
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { authErrorKey } from "@/lib/auth/errors";
import { safeNext } from "@/lib/auth/routes";
import { createSupabaseServer } from "@/lib/supabase/server";
import { notify } from "@/lib/email/send";
import { billingSecret, serverDb } from "@/lib/server/db";

/** The welcome email: once per account, ever (the database remembers). Never delays or blocks the sign-in. */
async function welcome(origin: string) {
  try {
    if (!billingSecret()) return;
    const db = await serverDb();
    if (!db?.user) return;
    const language = (await db.rpc<{ profile?: { language?: string } }>("billing_summary", { secret: billingSecret(), uid: db.user.id })).profile?.language;
    await notify(db, { kind: "welcome", to: db.user.email, userId: db.user.id, language: language === "en" ? "en" : "ka", dedupeKey: `${db.user.id}:welcome`, data: { siteUrl: origin } });
  } catch {
    // e.g. the payments SQL isn't installed yet: no welcome email, nothing else changes
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const flow = searchParams.get("flow"); // "signup" | "recovery" | null (Google)
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Supabase reports problems like an expired link in the address itself.
  const linkErrorCode = searchParams.get("error_code");

  const go = (path: string) => NextResponse.redirect(new URL(path, origin));

  let error: { code?: string; message?: string } | null = linkErrorCode ? { code: linkErrorCode } : null;
  if (!error) {
    const supabase = await createSupabaseServer();
    if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
    else if (tokenHash && type) ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
    else error = { code: "flow_state_not_found" };
  }

  if (!error) {
    // Email confirmed or Google chosen (not a password reset): say hello, once.
    if (flow !== "recovery") await welcome(origin);
    return go(next);
  }

  const key = authErrorKey(error);
  if (flow === "signup") {
    // Opened in another browser: Supabase has still confirmed the email —
    // the teacher only has to sign in there.
    if (!linkErrorCode) return go("/signin?notice=confirmed");
    return go(`/signin?error=${key}`);
  }
  if (flow === "recovery") return go(`/forgot-password?error=${key}`);
  return go(`/signin?error=${key}`);
}
