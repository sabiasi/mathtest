"use client";

/**
 * Payments as the browser sees them: are they switched on, and (signed in)
 * the next payment, the card's last 4 digits and the receipts.
 *
 * Loaded from GET /api/billing/summary only when a component that needs it
 * is on the screen (pricing, Settings → My plan, the upgrade window), so
 * ordinary pages don't make the extra request.
 *
 * It only SHOWS things. Buying, cancelling… are POSTs to /api/billing/…,
 * where the server decides.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { useLanguage, useT } from "@/i18n/language";
import { asBillingError, type BillingError, type BillingSummary } from "@/lib/payments/summary";
import type { BillingPeriod } from "@/lib/plans/plans";

type State = { key: string; summary: BillingSummary | null };
let state: State = { key: "", summary: null };
let loading = "";
const listeners = new Set<() => void>();
const EMPTY: State = { key: "", summary: null };

function set(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function load(key: string, force = false): Promise<BillingSummary | null> {
  if (!key) return null;
  if (!force && (loading === key || (state.key === key && state.summary))) return state.summary;
  loading = key;
  try {
    const response = await fetch("/api/billing/summary", { cache: "no-store" });
    const summary = response.ok ? ((await response.json()) as BillingSummary) : null;
    if (loading === key || state.key === key) set({ key, summary: summary ?? (state.key === key ? state.summary : null) });
    return summary;
  } catch {
    return null;
  } finally {
    if (loading === key) loading = "";
  }
}

/** Whose summary this is: an account's id, or "guest". "" while we don't know yet. */
function useBillingKey(): string {
  const { status, user } = useAuth();
  if (status === "loading") return "";
  return status === "signed-in" && user ? user.id : "guest";
}

export function useBilling(active = true): { summary: BillingSummary | null; refresh: () => Promise<BillingSummary | null> } {
  const key = useBillingKey();
  const snapshot = useSyncExternalStore(subscribe, () => state, () => EMPTY);
  useEffect(() => {
    if (active && key) void load(key);
  }, [active, key]);
  const refresh = useCallback(() => load(key, true), [key]);
  return { summary: snapshot.key === key ? snapshot.summary : null, refresh };
}

/** Reloads the summary if some component is showing it (after a plan change elsewhere). */
export function refreshBilling(): void {
  if (state.key && listeners.size > 0) void load(state.key, true);
}

export type BillingAnswer<T> = ({ ok: true } & T) | { ok: false; error: BillingError };

/** POST to one of our billing routes; never throws. */
export async function billingPost<T = Record<string, unknown>>(path: string, body: Record<string, unknown> = {}): Promise<BillingAnswer<T>> {
  try {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) return { ok: false, error: asBillingError(data.error) };
    return { ok: true, ...(data as T) };
  } catch {
    return { ok: false, error: "failed" };
  }
}

/**
 * "Buy": asks our server for the payment page and goes there.
 * Returns a function; `busy` is handled by the caller.
 */
export function useStartCheckout(): (period: BillingPeriod) => Promise<boolean> {
  const t = useT();
  const language = useLanguage();
  return useCallback(
    async (period: BillingPeriod) => {
      const answer = await billingPost<{ url: string }>("/api/billing/checkout", { period, language });
      if (!answer.ok) {
        toast.error(t(`billing.error.${answer.error}`));
        return false;
      }
      toast(t("billing.starting"));
      window.location.assign(answer.url);
      return true;
    },
    [t, language],
  );
}
