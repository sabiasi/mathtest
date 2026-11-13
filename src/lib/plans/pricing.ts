/**
 * Small calculations for the pricing page, from the prices in plans.ts.
 */
import { PERIOD_MONTHS, PREMIUM_PRICES_GEL, type BillingPeriod } from "./plans";

/** "≈ 10 ₾ a month" — the price divided by the months it covers (one decimal at most). */
export function monthlyEquivalent(period: BillingPeriod): number {
  return Math.round((PREMIUM_PRICES_GEL[period] / PERIOD_MONTHS[period]) * 10) / 10;
}

/** How much cheaper than paying monthly for the same months, in whole percent (0 for monthly). */
export function discountPercent(period: BillingPeriod): number {
  const monthly = PREMIUM_PRICES_GEL.month * PERIOD_MONTHS[period];
  return Math.max(0, Math.round((1 - PREMIUM_PRICES_GEL[period] / monthly) * 100));
}

/** 15 → "15", 12.5 → "12.5" (no trailing ".0"). */
export function formatGel(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
}
