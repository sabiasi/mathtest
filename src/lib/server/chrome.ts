import { existsSync } from "node:fs";
import puppeteer, { type Browser } from "puppeteer-core";

/**
 * Finds Google Chrome (or Chromium) on this computer.
 * Set the CHROME_PATH environment variable to use a different one —
 * e.g. on a hosting server, where we'll install a special Chromium later.
 */
export function findChrome(): string | null {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find((path): path is string => !!path && existsSync(path)) ?? null;
}

// Starting Chrome takes ~1 second, so we start it once and reuse it.
let browserPromise: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> {
  const executablePath = findChrome();
  if (!executablePath) throw new Error("CHROME_NOT_FOUND");

  if (browserPromise) {
    const browser = await browserPromise.catch(() => null);
    if (browser?.connected) return browser;
  }
  browserPromise = puppeteer.launch({
    executablePath,
    headless: true,
    // Exact font shapes in the PDF (no hinting tweaks).
    args: ["--font-render-hinting=none"],
  });
  return browserPromise;
}
