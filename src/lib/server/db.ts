import "server-only";
import { cookies } from "next/headers";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server";
import { entitlementsFor, freeWhilePremiumHidden, guestEntitlements, type Entitlements } from "@/lib/plans/entitlements";
import { serverEntitlements } from "@/lib/plans/server";
import { schoolSeatFromJson, subscriptionFromRow } from "@/lib/plans/subscription";
import { SANDBOX_SECRET, sandboxEnabled, sandboxEnsureUser, sandboxRpc } from "./sandbox";

/**
 * The database as our server routes see it: who is signed in, and a way to
 * call database functions ("rpc" = remote procedure call).
 *
 * Normally that is Supabase, with the visitor's own sign-in cookie and the
 * PUBLIC key — never a secret / service_role key. Functions that change a
 * plan additionally demand `billingSecret()`, which only this server knows.
 *
 * With MATHTEST_SANDBOX=1 it is the in-memory sandbox instead (see sandbox.ts).
 */
export type ServerUser = { id: string; email: string | null };
export type ServerDb = {
  sandbox: boolean;
  user: ServerUser | null;
  rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T>;
  /** What the signed-in teacher's plan allows right now (guests and unknown: Free). */
  entitlements(): Promise<Entitlements>;
};

/** The secret our billing functions in the database ask for. "" = not set up. */
export function billingSecret(): string {
  if (sandboxEnabled()) return SANDBOX_SECRET;
  return (process.env.BILLING_SERVER_SECRET ?? "").trim();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sandbox only: read the user from the sign-in cookie WITHOUT checking its signature. */
async function unverifiedCookieUser(): Promise<ServerUser | null> {
  const store = await cookies();
  const all = store.getAll().filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name));
  let value = all.map((c) => c.value).join("");
  if (!value) return null;
  try {
    if (value.startsWith("base64-")) value = Buffer.from(value.slice(7), "base64url").toString("utf8");
    const session = JSON.parse(decodeURIComponent(value)) as { user?: { id?: string; email?: string } };
    const id = session.user?.id ?? "";
    return UUID.test(id) ? { id, email: session.user?.email ?? null } : null;
  } catch {
    return null;
  }
}

/** null = no database is connected (Supabase not configured and no sandbox). */
export async function serverDb(): Promise<ServerDb | null> {
  if (sandboxEnabled()) {
    let user: ServerUser | null = null;
    if (supabaseConfigured) {
      try {
        const supabase = await createSupabaseServer();
        const { data } = await supabase.auth.getClaims();
        if (data?.claims?.sub) user = { id: data.claims.sub, email: typeof data.claims.email === "string" ? data.claims.email : null };
      } catch {
        user = null;
      }
    }
    user ??= await unverifiedCookieUser();
    if (user) await sandboxEnsureUser(user.id, user.email);
    const id = user?.id ?? null;
    const rpc: ServerDb["rpc"] = (fn, args = {}) => sandboxRpc(fn, args, id);
    return {
      sandbox: true,
      user,
      rpc,
      async entitlements() {
        if (!id) return guestEntitlements();
        const summary = await rpc<{ subscription?: Parameters<typeof subscriptionFromRow>[0] }>("billing_summary", { secret: SANDBOX_SECRET, uid: id });
        const seat = schoolSeatFromJson(await rpc("my_school_seat"));
        return freeWhilePremiumHidden(entitlementsFor(subscriptionFromRow(summary.subscription ?? null), new Date(), seat)); // HIDDEN_FOR_TESTING
      },
    };
  }
  if (!supabaseConfigured) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  const user = sub ? { id: sub, email: typeof data.claims.email === "string" ? data.claims.email : null } : null;
  return {
    sandbox: false,
    user,
    async rpc<T>(fn: string, args: Record<string, unknown> = {}) {
      const { data: result, error } = await supabase.rpc(fn, args);
      if (error) throw error;
      return result as T;
    },
    entitlements: () => serverEntitlements(supabase, user?.id ?? null),
  };
}
