/**
 * Geography helpers (pure — no React): map scale and climate charts.
 *
 * Scale: on a map of 1 : 50 000, 1 cm on the map is 50 000 cm = 500 m
 * on the ground. Climate: 12 monthly temperatures (°C) and precipitation
 * amounts (mm); the chart and the answers are calculated from them.
 */
import type { Language } from "@/i18n/dictionaries";
import { monthNames } from "@/lib/format";
import type { ClimateChartQuestion, ClimateTask, ScaleCalcQuestion, ScaleRow } from "@/lib/storage/types";

export const GEO_LIMITS = {
  rows: 8,
  denominator: { min: 2, max: 100_000_000 },
  value: 1_000_000,
  temperature: { min: -70, max: 60 },
  precipitation: 2000,
};

/** Centimetres in one km / m. */
const CM_IN = { km: 100_000, m: 100, cm: 1 } as const;

/** Round to at most `decimals` decimals (and get rid of 0.30000000000000004). */
export function roundTo(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * 1234567.5 → "1 234 567,5" (Georgian, decimal comma) or "1 234 567.5" (English).
 * Thousands are separated by a no-break space; trailing zeros are dropped.
 */
export function formatNumber(value: number, language: Language, decimals = 2): string {
  const rounded = roundTo(value, decimals);
  const negative = rounded < 0;
  const [whole, fraction] = Math.abs(rounded).toString().split(".");
  // Very big or small numbers come as "1e+21": leave those alone.
  if (/e/i.test(whole)) return rounded.toString();
  const grouped = whole.length > 4 ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : whole;
  const sign = negative ? "−" : "";
  return fraction ? `${sign}${grouped}${language === "ka" ? "," : "."}${fraction}` : `${sign}${grouped}`;
}

/** "2,5" or "2.5" or "−3" → 2.5 / −3; null when it isn't a number. */
export function parseNumber(text: string): number | null {
  const cleaned = text.trim().replace(/[\s ]/g, "").replace(",", ".").replace("−", "-");
  if (!cleaned || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

// ---------------------------------------------------------------------------
// Scale
// ---------------------------------------------------------------------------

export type DistanceUnit = keyof typeof CM_IN;

/** The answer to one row: the real distance (in `realUnit`) or the map distance (in cm). */
export function scaleAnswer(row: ScaleRow, denominator: number, realUnit: "km" | "m"): number {
  if (denominator <= 0) return 0;
  return row.ask === "real" ? (row.value * denominator) / CM_IN[realUnit] : (row.value * CM_IN[realUnit]) / denominator;
}

/** "1 : 50 000" */
export const numericScale = (denominator: number, language: Language) => `1 : ${formatNumber(denominator, language, 0)}`;

/** What 1 cm on the map is on the ground, in the most natural unit: 50 000 → 500 m; 2 500 000 → 25 km. */
export function namedScale(denominator: number): { value: number; unit: DistanceUnit } {
  if (denominator >= CM_IN.km) return { value: roundTo(denominator / CM_IN.km, 3), unit: "km" };
  if (denominator >= CM_IN.m) return { value: roundTo(denominator / CM_IN.m, 3), unit: "m" };
  return { value: denominator, unit: "cm" };
}

/** A scale bar: `segments` pieces of 1 cm each, labelled 0, step, 2·step… (in `unit`). */
export function scaleBar(denominator: number): { segments: number; step: number; unit: DistanceUnit } {
  const { value, unit } = namedScale(denominator);
  return { segments: 4, step: value, unit };
}

/** Rows that can be printed (a positive value). */
export const scaleRows = (question: ScaleCalcQuestion) => question.rows.filter((row) => row.value > 0);

// ---------------------------------------------------------------------------
// Climate
// ---------------------------------------------------------------------------

/** The indexes (0 = January) where `values` reach `target`. */
const monthsWith = (values: number[], target: number) => values.flatMap((v, i) => (v === target ? [i] : []));

export function climateStats(temperature: number[], precipitation: number[]) {
  const tMax = Math.max(...temperature);
  const tMin = Math.min(...temperature);
  const pMax = Math.max(...precipitation);
  const pMin = Math.min(...precipitation);
  return {
    warmest: monthsWith(temperature, tMax),
    coldest: monthsWith(temperature, tMin),
    tMax,
    tMin,
    range: roundTo(tMax - tMin, 1),
    mean: roundTo(temperature.reduce((a, b) => a + b, 0) / 12, 1),
    total: roundTo(precipitation.reduce((a, b) => a + b, 0), 1),
    wettest: monthsWith(precipitation, pMax),
    driest: monthsWith(precipitation, pMin),
    pMax,
    pMin,
  };
}

/** The answer-key text of one climate question, e.g. "ივლისი (25 °C)" or "8,2 °C". */
export function climateAnswer(question: ClimateChartQuestion, task: ClimateTask, language: Language): string {
  const s = climateStats(question.temperature, question.precipitation);
  const months = (list: number[]) => list.map((i) => monthNames(language)[i]).join(", ");
  const n = (value: number) => formatNumber(value, language, 1);
  const mm = language === "ka" ? "მმ" : "mm";
  switch (task) {
    case "warmest":
      return `${months(s.warmest)} (${n(s.tMax)} °C)`;
    case "coldest":
      return `${months(s.coldest)} (${n(s.tMin)} °C)`;
    case "range":
      return `${n(s.tMax)} − ${s.tMin < 0 ? `(${n(s.tMin)})` : n(s.tMin)} = ${n(s.range)} °C`;
    case "mean":
      return `${n(s.mean)} °C`;
    case "total":
      return `${n(s.total)} ${mm}`;
    case "wettest":
      return `${months(s.wettest)} (${n(s.pMax)} ${mm})`;
    case "driest":
      return `${months(s.driest)} (${n(s.pMin)} ${mm})`;
  }
}

/** A "nice" step for an axis: the smallest of 1, 2, 2.5, 5 × 10ⁿ that is ≥ `raw`. */
function niceStep(raw: number): number {
  if (raw <= 0) return 10;
  const power = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * power >= raw - 1e-9) return m * power;
  return 10 * power;
}

/**
 * The chart's two axes. They share the same grid lines: temperature on the
 * left (from its minimum, at most 0), precipitation on the right (from 0).
 */
export function climateAxes(temperature: number[], precipitation: number[]) {
  const max = Math.max(...temperature, 0);
  const min = Math.min(...temperature, 0);
  let tStep = max - min > 40 ? 10 : 5;
  let tMin = Math.floor(min / tStep) * tStep;
  let tMax = Math.ceil(max / tStep) * tStep;
  if (tMax === tMin) tMax = tMin + tStep;
  while ((tMax - tMin) / tStep < 4) tMax += tStep;
  // Too many lines (e.g. −40…+30 by 5): use 10.
  if ((tMax - tMin) / tStep > 10) {
    tStep = 10;
    tMin = Math.floor(min / tStep) * tStep;
    tMax = Math.max(Math.ceil(max / tStep) * tStep, tMin + 4 * tStep);
  }
  const lines = Math.round((tMax - tMin) / tStep);
  const pStep = niceStep(Math.max(...precipitation, 0) / lines);
  return { tMin, tMax, tStep, pMax: pStep * lines, pStep, lines };
}

/** Short month names for the chart: "იან", "თებ"… / "Jan", "Feb"… */
export const shortMonths = (language: Language) => monthNames(language).map((name) => name.slice(0, 3));
