import { describe, expect, it } from "vitest";
import { isProtectedPath, safeNext } from "./routes";

describe("isProtectedPath", () => {
  it("protects My tests, the editor, print and settings", () => {
    for (const path of ["/tests", "/editor/abc", "/print/abc", "/settings"]) expect(isProtectedPath(path)).toBe(true);
  });
  it("leaves public pages open", () => {
    for (const path of ["/", "/about", "/signin", "/signup", "/forgot-password", "/testsuite"]) expect(isProtectedPath(path)).toBe(false);
  });
});

describe("safeNext", () => {
  it("keeps addresses on our own site", () => {
    expect(safeNext("/editor/abc?x=1")).toBe("/editor/abc?x=1");
  });
  it("refuses other websites and odd values", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "", null, undefined]) {
      expect(safeNext(bad)).toBe("/tests");
    }
  });
});
