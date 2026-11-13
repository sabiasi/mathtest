import { describe, expect, it } from "vitest";
import { isProtectedPath, safeNext } from "./routes";

describe("isProtectedPath", () => {
  it("protects settings", () => {
    for (const path of ["/settings", "/settings/x"]) expect(isProtectedPath(path)).toBe(true);
  });
  it("leaves everything else open — guests can make tests without an account", () => {
    for (const path of ["/", "/about", "/signin", "/signup", "/forgot-password", "/tests", "/editor/abc", "/print/abc", "/settingsx"]) {
      expect(isProtectedPath(path)).toBe(false);
    }
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
