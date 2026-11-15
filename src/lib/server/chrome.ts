import { existsSync } from "node:fs";
import puppeteer, { type Browser, type Page } from "puppeteer-core";

/**
 * The invisible Chrome that makes PDFs and the pictures inside Word files.
 *
 * Which Chrome is used (`chooseChrome`), in this order:
 * 1. `CHROME_PATH` — a Chrome you point at yourself (any computer or server).
 * 2. On Vercel (and other AWS-Lambda-style hosting): the small Chromium that
 *    ships inside the `@sparticuz/chromium` package. Those servers have no
 *    Chrome installed and nothing can be installed on them. Force it
 *    anywhere on Linux with `CHROME_BUNDLED=1`.
 * 3. A Chrome / Chromium installed on this computer (how it works locally).
 *
 * None of them → "CHROME_NOT_FOUND" → the PDF route answers 501 and the
 * print page falls back to the browser's own Print window.
 */

/** Environment variables (a plain object in tests). */
type Env = Record<string, string | undefined>;

const LOCAL_CHROMES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

/** Finds Google Chrome (or Chromium) installed on this computer; `CHROME_PATH` wins. */
export function findChrome(env: Env = process.env, exists: (path: string) => boolean = existsSync): string | null {
  return [env.CHROME_PATH, ...LOCAL_CHROMES].find((path): path is string => !!path && exists(path)) ?? null;
}

export type ChromeChoice = { kind: "installed"; executablePath: string } | { kind: "bundled" } | null;

/** Decides which Chrome to start (pure: the environment and the disk check are passed in, so it can be tested). */
export function chooseChrome(
  env: Env = process.env,
  platform: string = process.platform,
  exists: (path: string) => boolean = existsSync,
): ChromeChoice {
  if (env.CHROME_PATH && exists(env.CHROME_PATH)) return { kind: "installed", executablePath: env.CHROME_PATH };
  // The packaged Chromium is a Linux program: it can't run on a Mac or on Windows.
  const serverless = !!(env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME || env.AWS_EXECUTION_ENV);
  if (platform === "linux" && (serverless || env.CHROME_BUNDLED === "1")) return { kind: "bundled" };
  const executablePath = findChrome(env, exists);
  return executablePath ? { kind: "installed", executablePath } : null;
}

async function launch(choice: NonNullable<ChromeChoice>): Promise<Browser> {
  if (choice.kind === "installed") {
    return puppeteer.launch({
      executablePath: choice.executablePath,
      headless: true,
      // Exact font shapes in the PDF (no hinting tweaks).
      args: ["--font-render-hinting=none"],
    });
  }
  // Loaded only where it is used: on other machines the package is never touched.
  const { default: chromium } = await import("@sparticuz/chromium");
  chromium.setGraphicsMode = false; // no 3D drawing needed: starts faster, uses less memory
  return puppeteer.launch({
    // It unpacks itself into the server's temporary folder on the first start (a few seconds).
    executablePath: await chromium.executablePath(),
    headless: "shell",
    args: await puppeteer.defaultArgs({ args: [...chromium.args, "--font-render-hinting=none"], headless: "shell" }),
  });
}

// Starting Chrome takes ~1 second (several on a cold server), so we start it once and reuse it.
let browserPromise: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> {
  const choice = chooseChrome();
  if (!choice) throw new Error("CHROME_NOT_FOUND");

  if (browserPromise) {
    const browser = await browserPromise.catch(() => null);
    if (browser?.connected) return browser;
  }
  const starting = launch(choice);
  browserPromise = starting;
  // A Chrome that failed to start is forgotten, so the next request tries again.
  starting.catch(() => {
    if (browserPromise === starting) browserPromise = null;
  });
  return starting;
}

/** Forgets the running Chrome (it crashed, or the server was asleep and lost it) and closes it if it still answers. */
async function dropBrowser(): Promise<void> {
  const old = browserPromise;
  browserPromise = null;
  const browser = await old?.catch(() => null);
  // Don't wait: a dead Chrome may never answer.
  void browser?.close().catch(() => {});
}

const NEW_TAB_TIMEOUT_MS = 15_000;

/**
 * A new, empty tab. A reused Chrome can be dead without saying so (servers
 * that are put to sleep between requests): when the tab doesn't open, Chrome
 * is started again, once. Throws "CHROME_NOT_FOUND" when there is no Chrome.
 */
export async function newBrowserPage(): Promise<Page> {
  const open = async () => {
    const browser = await getBrowser();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tab = browser.newPage();
    try {
      return await Promise.race([
        tab,
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("CHROME_TAB_TIMEOUT")), NEW_TAB_TIMEOUT_MS); }),
      ]);
    } catch (error) {
      void tab.then((page) => page.close()).catch(() => {}); // a tab that opened too late
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    return await open();
  } catch (error) {
    if (error instanceof Error && error.message === "CHROME_NOT_FOUND") throw error;
    console.error("MathTest: Chrome did not answer, starting it again", error);
    await dropBrowser();
    return open();
  }
}
