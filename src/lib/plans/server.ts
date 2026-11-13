import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { entitlementsFor, guestEntitlements, type Entitlements } from "./entitlements";
import { loadSubscription } from "./subscription";

/**
 * What the signed-in user (or a guest) may do, worked out ON THE SERVER.
 * Routes like /api/pdf use this, so a limit can't be skipped by changing
 * the website's code in the browser.
 *
 * If the database can't be reached we fall back to Free: a limit that's a
 * bit too strict for a moment is better than one that can be skipped.
 */
export async function serverEntitlements(supabase: SupabaseClient | null, userId: string | null): Promise<Entitlements> {
  if (!supabase || !userId) return guestEntitlements();
  try {
    return entitlementsFor(await loadSubscription(supabase, userId));
  } catch (error) {
    console.error("MathTest: could not load the subscription", error);
    return entitlementsFor(null);
  }
}
