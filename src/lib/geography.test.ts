import { describe, expect, it } from "vitest";
import { climateAnswer, climateAxes, climateStats, formatNumber, namedScale, numericScale, parseNumber, scaleAnswer } from "./geography";
import { georgiaPercent } from "./images/builtinPictures";
import { usedImageIds } from "./images/imageMath";
import { createQuestion } from "./questions";
import { normalizeTest } from "./storage/migrate";
import type { ClimateChartQuestion } from "./storage/types";

describe("numbers", () => {
  it("formats with a decimal comma in Georgian and groups thousands", () => {
    expect(formatNumber(2.5, "ka")).toBe("2,5");
    expect(formatNumber(2.5, "en")).toBe("2.5");
    expect(formatNumber(50000, "ka")).toBe("50 000");
    expect(formatNumber(2500, "ka")).toBe("2500");
    expect(formatNumber(-3, "ka")).toBe("−3");
    expect(formatNumber(0.1 + 0.2, "en")).toBe("0.3");
  });
  it("reads numbers typed either way", () => {
    expect(parseNumber("2,5")).toBe(2.5);
    expect(parseNumber("−3")).toBe(-3);
    expect(parseNumber("50 000")).toBe(50000);
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber("")).toBeNull();
  });
});

describe("map scale", () => {
  it("converts map cm to real distances and back", () => {
    // 1 : 50 000 → 1 cm = 500 m = 0.5 km
    expect(scaleAnswer({ id: "a", value: 4, ask: "real" }, 50_000, "km")).toBe(2);
    expect(scaleAnswer({ id: "b", value: 3, ask: "map" }, 50_000, "km")).toBe(6);
    expect(scaleAnswer({ id: "c", value: 7, ask: "real" }, 25_000, "m")).toBe(1750);
    expect(scaleAnswer({ id: "d", value: 120, ask: "map" }, 2_000_000, "km")).toBe(6);
  });
  it("writes the scale as a ratio and in words", () => {
    expect(numericScale(50_000, "ka")).toBe("1 : 50 000");
    expect(namedScale(50_000)).toEqual({ value: 500, unit: "m" });
    expect(namedScale(2_500_000)).toEqual({ value: 25, unit: "km" });
    expect(namedScale(50)).toEqual({ value: 50, unit: "cm" });
  });
});

describe("climate", () => {
  const q = {
    ...(createQuestion("climate-chart") as ClimateChartQuestion),
    temperature: [-2, 0, 4, 10, 15, 19, 22, 21, 16, 10, 4, 0],
    precipitation: [30, 28, 35, 50, 75, 80, 60, 55, 45, 40, 38, 32],
    tasks: ["warmest", "coldest", "range", "mean", "total", "wettest", "driest"],
  } satisfies ClimateChartQuestion;

  it("finds the warmest / coldest / wettest months and totals", () => {
    const s = climateStats(q.temperature, q.precipitation);
    expect(s.warmest).toEqual([6]);
    expect(s.coldest).toEqual([0]);
    expect(s.range).toBe(24);
    expect(s.mean).toBe(9.9); // 119 / 12 = 9.9166…
    expect(s.total).toBe(568);
    expect(s.wettest).toEqual([5]);
    expect(s.driest).toEqual([1]);
  });
  it("writes the answers in Georgian", () => {
    expect(climateAnswer(q, "warmest", "ka")).toBe("ივლისი (22 °C)");
    expect(climateAnswer(q, "range", "ka")).toBe("22 − (−2) = 24 °C");
    expect(climateAnswer(q, "mean", "ka")).toBe("9,9 °C");
    expect(climateAnswer(q, "total", "ka")).toBe("568 მმ");
  });
  it("lists every month that ties", () => {
    expect(climateStats([1, 5, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0], Array(12).fill(10)).warmest).toEqual([1, 2]);
  });
  it("makes axes that share grid lines and cover the data", () => {
    const axes = climateAxes(q.temperature, q.precipitation);
    expect(axes.tMin).toBeLessThanOrEqual(-2);
    expect(axes.tMax).toBeGreaterThanOrEqual(22);
    expect(axes.pMax).toBeGreaterThanOrEqual(80);
    expect((axes.tMax - axes.tMin) / axes.tStep).toBe(axes.lines);
    expect(axes.pStep * axes.lines).toBe(axes.pMax);
  });
});

describe("saved data", () => {
  it("repairs geography questions and keeps tips and folders", () => {
    const test = normalizeTest({
      id: "t",
      folder: "  I კვარტალი ",
      questions: [
        { id: "s", type: "scale-calc", denominator: -5, rows: [{ id: "r", value: 3, ask: "map" }], tip: "მხოლოდ რედაქტორში" },
        { id: "c", type: "climate-chart", temperature: [1, 2], tasks: ["range", "nonsense"] },
      ],
    })!;
    expect(test.folder).toBe("I კვარტალი");
    const [s, c] = test.questions;
    expect(s.type === "scale-calc" && s.denominator).toBe(2);
    expect(s.tip).toBe("მხოლოდ რედაქტორში");
    expect(c.type === "climate-chart" && c.temperature).toEqual([1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(c.type === "climate-chart" && c.tasks).toEqual(["range"]);
  });
  it("never treats built-in pictures as stored ones", () => {
    const test = normalizeTest({
      id: "t",
      questions: [{ id: "m", type: "map", map: { imageId: "builtin:georgia-map", width: 570, height: 285 }, markers: [], mapWidth: 100 }],
    })!;
    expect(usedImageIds([test]).size).toBe(0);
  });
  it("puts Tbilisi east of Batumi on the outline map", () => {
    const tbilisi = georgiaPercent(44.79, 41.72);
    const batumi = georgiaPercent(41.64, 41.65);
    expect(tbilisi.x).toBeGreaterThan(batumi.x);
    expect(tbilisi.x).toBeLessThan(100);
    expect(batumi.y).toBeGreaterThan(0);
  });
});
