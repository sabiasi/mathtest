import { describe, expect, it } from "vitest";
import { chooseChrome, findChrome } from "./chrome";

const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const only = (...paths: string[]) => (path: string) => paths.includes(path);

describe("which Chrome makes the PDFs", () => {
  it("a teacher's own computer: the installed Chrome", () => {
    expect(chooseChrome({}, "darwin", only(MAC_CHROME))).toEqual({ kind: "installed", executablePath: MAC_CHROME });
    expect(findChrome({}, only(MAC_CHROME))).toBe(MAC_CHROME);
  });

  it("CHROME_PATH wins everywhere, also on Vercel", () => {
    const env = { CHROME_PATH: "/opt/chrome", VERCEL: "1" };
    expect(chooseChrome(env, "linux", only("/opt/chrome", "/usr/bin/chromium"))).toEqual({ kind: "installed", executablePath: "/opt/chrome" });
  });

  it("a CHROME_PATH that doesn't exist is ignored", () => {
    expect(chooseChrome({ CHROME_PATH: "/nowhere" }, "darwin", only(MAC_CHROME))).toEqual({ kind: "installed", executablePath: MAC_CHROME });
  });

  it("Vercel / Lambda: the Chromium packaged with the app", () => {
    expect(chooseChrome({ VERCEL: "1" }, "linux", only())).toEqual({ kind: "bundled" });
    expect(chooseChrome({ AWS_LAMBDA_FUNCTION_NAME: "fn" }, "linux", only())).toEqual({ kind: "bundled" });
    expect(chooseChrome({ CHROME_BUNDLED: "1" }, "linux", only("/usr/bin/chromium"))).toEqual({ kind: "bundled" });
  });

  it("the packaged Chromium is never chosen where it can't run (Mac, Windows)", () => {
    expect(chooseChrome({ VERCEL: "1", CHROME_BUNDLED: "1" }, "darwin", only(MAC_CHROME))).toEqual({ kind: "installed", executablePath: MAC_CHROME });
    expect(chooseChrome({ CHROME_BUNDLED: "1" }, "win32", only())).toBeNull();
  });

  it("no Chrome at all: null (the print page then uses the browser's own Print window)", () => {
    expect(chooseChrome({}, "linux", only())).toBeNull();
  });
});
