"use client";

/**
 * A date picker made of three plain dropdowns — day, month, year — instead
 * of the browser's date box (which shows "mm/dd/yyyy", the American order,
 * and a calendar pop-up that differs on every computer).
 *
 * Value: "YYYY-MM-DD", or "" for no date.
 */
import { useState } from "react";
import { useLanguage, useT } from "@/i18n/language";
import { monthNames } from "@/lib/format";

const pad = (n: number) => String(n).padStart(2, "0");
const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

function parse(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
}

export function DateField({
  value,
  onChange,
  labelId,
}: {
  value: string;
  onChange: (value: string) => void;
  /** id of the visible label, for screen readers */
  labelId: string;
}) {
  const t = useT();
  const language = useLanguage();
  const saved = parse(value);
  // While the teacher has picked only some of the three parts, keep them here.
  const [draft, setDraft] = useState<{ year?: number; month?: number; day?: number }>(saved ?? {});
  const parts = saved ?? draft;

  const thisYear = new Date().getFullYear();
  const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2];
  if (parts.year && !years.includes(parts.year)) years.unshift(parts.year);

  function update(changes: { year?: number; month?: number; day?: number }) {
    const next = { ...parts, ...changes };
    // 31 → 30 (or 28/29) if the new month is shorter.
    if (next.year && next.month && next.day) next.day = Math.min(next.day, daysInMonth(next.year, next.month));
    setDraft(next);
    if (next.year && next.month && next.day) onChange(`${next.year}-${pad(next.month)}-${pad(next.day)}`);
    else if (value) onChange(""); // a part was cleared
  }

  function today() {
    const now = new Date();
    update({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
  }

  const select =
    "rounded-lg border border-slate-300 bg-white px-2 py-2 text-[15px] text-slate-900 hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
  const number = (v: string) => (v === "" ? undefined : Number(v));

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby={labelId}>
      <select aria-label={t("date.day")} className={select} value={parts.day ?? ""} onChange={(e) => update({ day: number(e.target.value) })}>
        <option value="">{t("date.day")}</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select aria-label={t("date.month")} className={`${select} min-w-0 flex-1`} value={parts.month ?? ""} onChange={(e) => update({ month: number(e.target.value) })}>
        <option value="">{t("date.month")}</option>
        {monthNames(language).map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select aria-label={t("date.year")} className={select} value={parts.year ?? ""} onChange={(e) => update({ year: number(e.target.value) })}>
        <option value="">{t("date.year")}</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button type="button" onClick={today} className="rounded-lg px-2 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
        {t("date.today")}
      </button>
    </div>
  );
}
