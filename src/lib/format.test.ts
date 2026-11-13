import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatDayOf, formatSize, monthNames } from "./format";

// A date built from local parts, so the test works in any time zone.
const iso = new Date(2026, 10, 2, 9, 5).toISOString(); // 2 Nov 2026, 09:05

describe("formatDateTime", () => {
  it("writes Georgian month names", () => {
    expect(formatDateTime(iso, "ka")).toBe("2 ნოემბერი 2026, 09:05");
  });

  it("formats English dates", () => {
    expect(formatDateTime(iso, "en")).toBe("2 Nov 2026, 09:05");
  });
});

describe("formatDate", () => {
  it("formats a YYYY-MM-DD date", () => {
    expect(formatDate("2026-11-20", "ka")).toBe("20 ნოემბერი 2026");
    expect(formatDate("2026-11-20", "en")).toBe("20 Nov 2026");
    expect(formatDate("", "ka")).toBe("");
  });
});

describe("monthNames", () => {
  it("has 12 months in each language", () => {
    expect(monthNames("ka")[0]).toBe("იანვარი");
    expect(monthNames("ka")).toHaveLength(12);
    expect(monthNames("en")[11]).toBe("December");
  });
});

describe("formatDayOf", () => {
  it("shows the local day of a moment", () => {
    expect(formatDayOf(iso, "ka")).toBe("2 ნოემბერი 2026");
    expect(formatDayOf("not a date", "ka")).toBe("");
  });
});

describe("formatSize", () => {
  it("picks a readable unit", () => {
    expect(formatSize(900)).toBe("900 B");
    expect(formatSize(1536)).toBe("1.5 KB");
    expect(formatSize(50 * 1024 * 1024)).toBe("50 MB");
    expect(formatSize(1024 * 1024 * 1024)).toBe("1 GB");
  });
});
