import "server-only";
import type { Language } from "@/i18n/dictionaries";
import type { PaperHeader } from "@/lib/paperHeader";
import type { Entitlements } from "@/lib/plans/entitlements";
import { getBrowser } from "@/lib/server/chrome";
import type { Test } from "@/lib/storage/types";
import { pictureKey, type BlockPictures, type DocxVersion } from "./fromTest";

const LANGUAGE_KEY = "mathtest:language";
const THEME_KEY = "mathtest:theme";

export type Wanted = { variant: string; version: DocxVersion; keys: string[] };

/**
 * Takes sharp pictures of printed questions for the Word file: opens our own
 * /print page in the invisible Chrome (exactly like the PDF route) and
 * photographs the wanted blocks at twice the screen resolution.
 * Throws "CHROME_NOT_FOUND" when there is no Chrome on this machine.
 */
export async function shootBlocks(
  origin: string,
  test: Test,
  wanted: Wanted[],
  options: { language: Language; images: Record<string, string>; entitlements: Entitlements; paperHeader: PaperHeader | null },
): Promise<BlockPictures> {
  const pictures: BlockPictures = {};
  if (wanted.length === 0) return pictures;
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // One column and normal size: each question is photographed at the full width of the page.
    const paper: Test = { ...test, printOptions: { ...test.printOptions, columns: 1, fontSize: "normal" } };
    await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 2 });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    await page.evaluateOnNewDocument(
      (testJson, languageKey, lang, themeKey, images, allowed, header) => {
        window.__MATHTEST_PRINT__ = { test: JSON.parse(testJson), entitlements: allowed, paperHeader: header };
        localStorage.setItem(languageKey, lang);
        localStorage.setItem(themeKey, "light");
        window.__MATHTEST_IMAGES__ = images;
      },
      JSON.stringify(paper),
      LANGUAGE_KEY,
      options.language,
      THEME_KEY,
      options.images,
      options.entitlements,
      options.paperHeader,
    );
    for (const { variant, version, keys } of wanted) {
      await page.goto(`${origin}/print/${encodeURIComponent(test.id)}?version=${version}&variant=${variant}`, { waitUntil: "load" });
      await page.waitForFunction(() => document.querySelector('[data-print-ready="true"]') !== null, { polling: 250, timeout: 60_000 });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => undefined))));
      for (const key of keys) {
        // ".sheet …": the real pages, not the invisible copies used for measuring.
        const block = await page.$(`.sheet [data-print-block=${JSON.stringify(key)}]`);
        const box = await block?.boundingBox();
        if (!block || !box || box.width < 1 || box.height < 1) continue;
        const data = await block.screenshot({ type: "png" });
        pictures[pictureKey(variant, version, key)] = { data: new Uint8Array(data), type: "png", width: box.width, height: box.height };
      }
    }
    return pictures;
  } finally {
    await page.close();
  }
}
