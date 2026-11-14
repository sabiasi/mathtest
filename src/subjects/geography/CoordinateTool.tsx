"use client";

import { useState, type MouseEvent } from "react";
import { useT } from "@/i18n/language";
import type { ToolbarWidgetProps } from "../types";

const keepFocus = (event: MouseEvent) => event.preventDefault();
const digits = (value: string, max: number) => {
  const n = value.replace(/\D/g, "").slice(0, 3);
  return n === "" ? "" : String(Math.min(Number(n), max));
};

/** Georgian and Latin ways to write the four sides of the world. */
export const SIDES = {
  ka: { N: "ჩ. გ.", S: "სამხ. გ.", E: "აღმ. გრძ.", W: "დას. გრძ." },
  en: { N: "N", S: "S", E: "E", W: "W" },
} as const;

/** The short side names on the N/S and E/W switch buttons. */
const SIDE_BUTTONS = {
  ka: { N: "ჩ.", S: "სამხ.", E: "აღმ.", W: "დას." },
  en: { N: "N", S: "S", E: "E", W: "W" },
} as const;

/** 41, 43, "N" → "41°43′ ჩ. გ." (Georgian) or "41°43′N" (Latin). */
export function formatCoordinate(degrees: number, minutes: number, side: keyof (typeof SIDES)["ka"], style: "ka" | "en"): string {
  const angle = `${degrees}°${minutes > 0 ? `${String(minutes).padStart(2, "0")}′` : ""}`;
  return style === "ka" ? `${angle} ${SIDES.ka[side]}` : `${angle}${SIDES.en[side]}`;
}

/**
 * "Coordinates": latitude and longitude in degrees and minutes, inserted as
 * "41°43′ ჩ. გ., 44°47′ აღმ. გრძ." or "41°43′N, 44°47′E".
 */
export function CoordinateTool({ insertText, style }: ToolbarWidgetProps) {
  const t = useT();
  // The tab's writing style (Georgian by default with the Georgian interface): its button comes first.
  const first: "ka" | "en" = style === "latin" ? "en" : "ka";
  const order: ("ka" | "en")[] = first === "ka" ? ["ka", "en"] : ["en", "ka"];
  const [lat, setLat] = useState({ d: "", m: "", side: "N" as "N" | "S" });
  const [lon, setLon] = useState({ d: "", m: "", side: "E" as "E" | "W" });
  const ready = lat.d !== "" && lon.d !== "";
  const text = (style: "ka" | "en") =>
    `${formatCoordinate(Number(lat.d), Number(lat.m || 0), lat.side, style)}, ${formatCoordinate(Number(lon.d), Number(lon.m || 0), lon.side, style)}`;
  const box =
    "h-8 w-11 rounded-md border border-input bg-card px-1 text-center tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const toggle =
    "h-8 min-w-8 rounded-md border bg-card px-1.5 text-sm font-semibold text-foreground hover:border-primary-soft-border hover:bg-primary-soft";
  const button =
    "h-10 rounded-lg border bg-card px-2.5 text-sm font-semibold text-foreground shadow-xs transition-colors hover:border-primary-soft-border hover:bg-primary-soft disabled:opacity-40 pointer-coarse:h-11";

  return (
    <div className="mr-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-muted px-2 py-1" data-coordinate-tool="">
      <span className="text-sm text-soft-foreground">{t("geo.latitude")}</span>
      <input inputMode="numeric" className={box} value={lat.d} placeholder="41" aria-label={t("geo.latDegrees")} onChange={(e) => setLat({ ...lat, d: digits(e.target.value, 90) })} />
      °
      <input inputMode="numeric" className={box} value={lat.m} placeholder="43" aria-label={t("geo.minutes")} onChange={(e) => setLat({ ...lat, m: digits(e.target.value, 59) })} />′
      <button type="button" className={toggle} onMouseDown={keepFocus} onClick={() => setLat({ ...lat, side: lat.side === "N" ? "S" : "N" })} title={t("geo.switchSide")}>
        {SIDE_BUTTONS[first][lat.side]}
      </button>
      <span className="ml-1 text-sm text-soft-foreground">{t("geo.longitude")}</span>
      <input inputMode="numeric" className={box} value={lon.d} placeholder="44" aria-label={t("geo.lonDegrees")} onChange={(e) => setLon({ ...lon, d: digits(e.target.value, 180) })} />
      °
      <input inputMode="numeric" className={box} value={lon.m} placeholder="47" aria-label={t("geo.minutes")} onChange={(e) => setLon({ ...lon, m: digits(e.target.value, 59) })} />′
      <button type="button" className={toggle} onMouseDown={keepFocus} onClick={() => setLon({ ...lon, side: lon.side === "E" ? "W" : "E" })} title={t("geo.switchSide")}>
        {SIDE_BUTTONS[first][lon.side]}
      </button>
      {order.map((kind) => (
        <button key={kind} type="button" className={button} disabled={!ready} onMouseDown={keepFocus} onClick={() => insertText(text(kind))} title={t("geo.insertCoordinates")} data-coordinate-insert={kind}>
          {ready ? text(kind) : kind === "ka" ? "— ჩ. გ." : "—N"}
        </button>
      ))}
    </div>
  );
}
