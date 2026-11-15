import { describe, expect, it } from "vitest";
import { EMPTY_HEADER, activePaperHeader, logoSizeMm, normalizePaperHeader } from "./paperHeader";

const full = { enabled: true, schoolName: " 51-ე საჯარო სკოლა ", logoImageId: "abc123", logoWidth: 400, logoHeight: 200, logoPosition: "right", extraLines: ["სემესტრული გამოცდა", "  ", "2026"] };

describe("paper header", () => {
  it("reads stored data safely", () => {
    expect(normalizePaperHeader(null)).toEqual(EMPTY_HEADER);
    expect(normalizePaperHeader("x")).toEqual(EMPTY_HEADER);
    expect(normalizePaperHeader(full)).toMatchObject({ enabled: true, logoImageId: "abc123", logoPosition: "right" });
    const odd = normalizePaperHeader({ enabled: "yes", schoolName: 5, logoImageId: "../../etc", logoWidth: -1, logoPosition: "top", extraLines: ["a", "b", "c", "d", 7] });
    expect(odd).toEqual({ ...EMPTY_HEADER, extraLines: ["a", "b", "c"] });
    // A logo without a size can't be laid out: treated as no logo.
    expect(normalizePaperHeader({ ...full, logoWidth: 0 }).logoImageId).toBe("");
    expect(normalizePaperHeader({ ...full, schoolName: "x".repeat(500) }).schoolName).toHaveLength(200);
  });

  it("prints only when on, not empty, and the plan allows it", () => {
    expect(activePaperHeader(full, true)).toMatchObject({ schoolName: "51-ე საჯარო სკოლა", extraLines: ["სემესტრული გამოცდა", "2026"] });
    expect(activePaperHeader(full, false)).toBeNull(); // Free: the default header
    expect(activePaperHeader({ ...full, enabled: false }, true)).toBeNull();
    expect(activePaperHeader({ enabled: true, schoolName: " ", extraLines: [""] }, true)).toBeNull();
    expect(activePaperHeader(undefined, true)).toBeNull();
  });

  it("sizes the logo within 18 × 45 mm, keeping its shape", () => {
    expect(logoSizeMm({ logoWidth: 400, logoHeight: 200 })).toEqual({ width: 36, height: 18 });
    expect(logoSizeMm({ logoWidth: 1000, logoHeight: 100 })).toEqual({ width: 45, height: 4.5 });
    expect(logoSizeMm({ logoWidth: 100, logoHeight: 400 })).toEqual({ width: 4.5, height: 18 });
    expect(logoSizeMm({ logoWidth: 0, logoHeight: 0 })).toEqual({ width: 0, height: 0 });
  });
});
