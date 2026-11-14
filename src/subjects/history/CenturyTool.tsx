"use client";

import { useState, type MouseEvent } from "react";
import { dictionaries } from "@/i18n/dictionaries";
import { useT } from "@/i18n/language";
import { centuryOf, toRoman } from "@/lib/roman";
import type { ToolbarWidgetProps } from "../types";

const keepFocus = (event: MouseEvent) => event.preventDefault();

/**
 * "Century: [12] → XII" — type a century (12) or a year (1121) and insert
 * the Roman numeral, with or without the word "century".
 */
export function CenturyTool({ insertText, style }: ToolbarWidgetProps) {
  const t = useT();
  // "ს." or "c.": follows the tab's writing style (Georgian / English), not only the interface.
  const word = style === "english" ? dictionaries.en["history.centuryShort"] : style === "georgian" ? dictionaries.ka["history.centuryShort"] : t("history.centuryShort");
  const [value, setValue] = useState("");
  const n = Number(value);
  // Small numbers are centuries; bigger ones are years (1121 → XII).
  const century = n > 0 ? (n > 30 ? centuryOf(n) : n) : 0;
  const roman = toRoman(century);
  const button =
    "h-10 rounded-lg border bg-card px-2.5 text-sm font-semibold text-foreground shadow-xs transition-colors hover:border-primary-soft-border hover:bg-primary-soft disabled:opacity-40 pointer-coarse:h-11";

  return (
    <div className="mr-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-muted px-2 py-1" data-century-tool="">
      <label className="flex items-center gap-1.5 text-sm text-soft-foreground">
        {t("history.centuryOrYear")}
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="12"
          aria-label={t("history.centuryOrYear")}
          className="h-8 w-16 rounded-md border border-input bg-card px-2 text-center tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <button type="button" className={button} disabled={!roman} onMouseDown={keepFocus} onClick={() => insertText(roman)} title={t("history.insertRoman")}>
        {roman || "—"}
      </button>
      <button
        type="button"
        className={button}
        disabled={!roman}
        onMouseDown={keepFocus}
        onClick={() => insertText(`${roman} ${word}`)}
        title={t("history.insertCentury")}
      >
        {roman ? `${roman} ${word}` : "—"}
      </button>
      {n > 30 && roman && <span className="text-xs text-muted-foreground">{t("history.yearIsCentury", { year: n, roman })}</span>}
    </div>
  );
}
