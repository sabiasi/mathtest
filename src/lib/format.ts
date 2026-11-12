import type { Language } from "@/i18n/dictionaries";

// Chrome does not ship Georgian date data for Intl.DateTimeFormat (it
// silently falls back to English), so Georgian dates are formatted by hand.
const GEORGIAN_MONTHS = [
  "იანვარი",
  "თებერვალი",
  "მარტი",
  "აპრილი",
  "მაისი",
  "ივნისი",
  "ივლისი",
  "აგვისტო",
  "სექტემბერი",
  "ოქტომბერი",
  "ნოემბერი",
  "დეკემბერი",
];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "2026-11-12T15:30:00Z" → "12 ნოემბერი 2026, 19:30" (ka) or
 * "12 Nov 2026, 19:30" (en), in the user's own time zone.
 */
export function formatDateTime(iso: string, language: Language): string {
  const d = new Date(iso);
  if (language === "ka") {
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return `${d.getDate()} ${GEORGIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${time}`;
  }
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
