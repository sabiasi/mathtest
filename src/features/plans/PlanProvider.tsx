"use client";

/**
 * Knows the signed-in teacher's plan. Any component asks with `usePlan()`.
 *
 * - Guests: always Free.
 * - Signed in: the `subscriptions` row (and the school seat, `my_school_seat`)
 *   is loaded from the database, again
 *   when the tab comes back into view (e.g. after paying in another tab).
 * - The PDF server's Chrome: the server hands over what the plan allows.
 *
 * This only decides what the screen SHOWS. The real limits are checked on
 * the server (PDF route, database rules), so changing this code in the
 * browser doesn't unlock anything.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { entitlementsFor, guestEntitlements, type Entitlements, type SchoolSeat, type Subscription } from "@/lib/plans/entitlements";
import { loadSchoolSeat, loadSubscription, schoolSeatFromJson, subscriptionFromRow } from "@/lib/plans/subscription";
import { refreshBilling, useBilling } from "@/features/billing/useBilling";
import { getSupabase } from "@/lib/supabase/client";

type PlanContextValue = {
  entitlements: Entitlements;
  /** False while a signed-in teacher's plan is still loading. */
  ready: boolean;
  /** Loads the plan again (after a change). */
  refresh: () => void;
};

const PlanContext = createContext<PlanContextValue | null>(null);

/**
 * Sandbox (`npm run dev:sandbox`, the browser tests): the plan lives in the
 * server's pretend database, so it is read through our own server instead
 * of from Supabase. See lib/server/sandbox.ts.
 */
const SANDBOX = process.env.NEXT_PUBLIC_MATHTEST_SANDBOX === "1";

/** Don't ask the database more than once a minute when the tab gets focus. */
const REFRESH_GAP_MS = 60_000;

export function PlanProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const userId = status === "signed-in" ? (user?.id ?? null) : null;
  // `forUser` remembers whose subscription this is, so a different account never sees it.
  const [loaded, setLoaded] = useState<{ forUser: string; subscription: Subscription | null; seat: SchoolSeat | null } | null>(null);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
    refreshBilling();
  }, []);
  const billing = useBilling(SANDBOX && userId !== null);

  useEffect(() => {
    if (!userId || SANDBOX) return;
    let cancelled = false;
    // The plan comes from the teacher's own subscription AND their school seat (a school may pay).
    Promise.all([loadSubscription(getSupabase(), userId), loadSchoolSeat(getSupabase()).catch(() => null)])
      .then(([subscription, seat]) => {
        if (!cancelled) setLoaded({ forUser: userId, subscription, seat });
      })
      .catch((error) => {
        console.error("MathTest: could not load the plan", error);
        // Show Free rather than "loading" forever; the next focus tries again.
        if (!cancelled) setLoaded((previous) => (previous?.forUser === userId ? previous : { forUser: userId, subscription: null, seat: null }));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, version]);

  // Coming back to the tab: the plan may have changed (payment, trial ended).
  useEffect(() => {
    if (!userId) return;
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < REFRESH_GAP_MS) return;
      last = Date.now();
      refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(refresh, REFRESH_GAP_MS);
    return () => { document.removeEventListener("visibilitychange", onVisible); clearInterval(timer); };
  }, [userId, refresh]);

  const injected = typeof window !== "undefined" ? window.__MATHTEST_PRINT__?.entitlements : undefined;
  const fromSandbox = useMemo(
    () => (SANDBOX && userId && billing.summary?.signedIn
      ? { forUser: userId, subscription: subscriptionFromRow(billing.summary.subscription), seat: schoolSeatFromJson(billing.summary.school) }
      : null),
    [userId, billing.summary],
  );
  const mine = SANDBOX ? fromSandbox : loaded && loaded.forUser === userId ? loaded : null;
  const ready = Boolean(injected) || status === "signed-out" || status === "unconfigured" || (userId !== null && mine !== null);

  const value = useMemo<PlanContextValue>(() => {
    let entitlements: Entitlements;
    if (injected) entitlements = injected;
    else if (userId && mine) entitlements = entitlementsFor(mine.subscription, new Date(), mine.seat);
    else if (userId) entitlements = entitlementsFor(null);
    else entitlements = guestEntitlements();
    return { entitlements, ready, refresh };
  }, [injected, userId, mine, ready, refresh]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

/** What the current user's plan allows (guests: Free). */
export function usePlan(): PlanContextValue {
  const value = useContext(PlanContext);
  if (!value) throw new Error("usePlan must be used inside <PlanProvider>");
  return value;
}
