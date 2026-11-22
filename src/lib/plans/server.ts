import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { entitlementsFor, freeWhilePremiumHidden, guestEntitlements, type Entitlements } from "./entitlements";
import { loadSchoolSeat, loadSubscription } from "./subscription";

/**
 * What the signed-in user (or a guest) may do, worked out ON THE SERVER.
 * Routes like /api/pdf use this, so a limit can't be skipped by changing
 * the website's code in the browser.
 *
 * If the database can't be reached we fall back to Free: a limit that's a
 * bit too strict for a moment is better than one that can be skipped.
 */
export async function serverEntitlements(supabase: SupabaseClient | null, userId: string | null): Promise<Entitlements> {
  if (!supabase || !userId) return freeWhilePremiumHidden(guestEntitlements()); // HIDDEN_FOR_TESTING
  try {
    const [subscription, seat] = await Promise.all([loadSubscription(supabase, userId), loadSchoolSeat(supabase)]);
    return freeWhilePremiumHidden(entitlementsFor(subscription, new Date(), seat)); // HIDDEN_FOR_TESTING
  } catch (error) {
    console.error("Rapido: could not load the subscription", error);
    return freeWhilePremiumHidden(entitlementsFor(null)); // HIDDEN_FOR_TESTING
  }
}
