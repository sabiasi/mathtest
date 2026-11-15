/**
 * Small, pure calculations for payments: the price in tetri and when a paid
 * period ends. The database has the same period rule in SQL
 * (`billing_period_end` in supabase/schema.sql) — change both together.
 */
import { PREMIUM_PRICES_GEL, type BillingPeriod } from "./plans";

/** Payment providers count in tetri (1 lari = 100 tetri), so no decimals are needed. */
export function priceTetri(period: BillingPeriod): number {
  return Math.round(PREMIUM_PRICES_GEL[period] * 100);
}

/** Georgia's clock is always 4 hours ahead of UTC (no summer time). */
const TBILISI_HOURS = 4;

/**
 * When a period that starts at `start` ends.
 * - month / year: the same day one month / year later (31 January → 28 February).
 * - schoolYear: the end of 30 June, Tbilisi time. Bought in July–December it
 *   ends next year; bought in January–June, the same year.
 */
export function periodEnd(start: Date, period: BillingPeriod): Date {
  if (period === "schoolYear") {
    const local = new Date(start.getTime() + TBILISI_HOURS * 3_600_000);
    const year = local.getUTCFullYear() + (local.getUTCMonth() + 1 >= 7 ? 1 : 0);
    return new Date(Date.UTC(year, 6, 1, -TBILISI_HOURS));
  }
  const months = period === "year" ? 12 : 1;
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}
