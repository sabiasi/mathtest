/**
 * POST /api/pdf  { test, version, variant, language, images }  →  the PDF file
 *
 * How it works: the test lives in the teacher's browser (localStorage), so
 * the page sends it here. We open an invisible Chrome, put the test into
 * THAT browser's localStorage, open our own /print page, wait until the
 * pages are laid out, and ask Chrome to "print to PDF". Chrome embeds the
 * fonts (Noto Sans Georgian, the math fonts) into the file.
 */
import { LANGUAGES, type Language } from "@/i18n/dictionaries";
import { getBrowser } from "@/lib/server/chrome";
import { normalizeTest } from "@/lib/storage/migrate";
import { STORAGE_KEY } from "@/lib/storage/testsRepository";

const LANGUAGE_KEY = "mathtest:language";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const test = normalizeTest(body?.test);
  const version = body?.version === "key" ? "key" : "student";
  // "A"…"F" or "all" — anything else falls back to "A".
  const variant = typeof body?.variant === "string" && /^([A-F]|all)$/.test(body.variant) ? body.variant : "A";
  const language: Language = LANGUAGES.includes(body?.language as Language) ? (body!.language as Language) : "ka";
  if (!test) return Response.json({ error: "invalid test" }, { status: 400 });
  // Pictures: { imageId: "data:image/png;base64,…" }. Only image data URLs are accepted.
  const images: Record<string, string> = {};
  if (body?.images && typeof body.images === "object") {
    for (const [id, url] of Object.entries(body.images as Record<string, unknown>)) {
      if (typeof url === "string" && /^data:image\/(png|jpeg|svg\+xml);base64,/.test(url)) images[id] = url;
    }
  }

  let browser;
  try {
    browser = await getBrowser();
  } catch {
    // No Chrome on this machine: the page falls back to the print dialog.
    return Response.json({ error: "chrome not available" }, { status: 501 });
  }

  const page = await browser.newPage();
  try {
    // Wide enough that the preview isn't shrunk to fit.
    await page.setViewport({ width: 1280, height: 1000 });
    // Runs before the page's own code: give this browser the test and language.
    await page.evaluateOnNewDocument(
      (storageKey, testsJson, languageKey, lang, pictures) => {
        localStorage.setItem(storageKey, testsJson);
        localStorage.setItem(languageKey, lang);
        window.__MATHTEST_IMAGES__ = pictures;
      },
      STORAGE_KEY,
      JSON.stringify([test]),
      LANGUAGE_KEY,
      language,
      images,
    );

    const origin = new URL(request.url).origin;
    await page.goto(`${origin}/print/${encodeURIComponent(test.id)}?version=${version}&variant=${variant}`, { waitUntil: "load" });
    // Ask "are the pages laid out?" every 250 ms. (waitForSelector relies on
    // the page drawing frames, and it missed the moment with many variants.)
    await page.waitForFunction(() => document.querySelector('[data-print-ready="true"]') !== null, {
      polling: 250,
      timeout: 60_000,
    });
    await page.evaluate(() => document.fonts.ready);
    // Every picture fully loaded, so none prints as an empty box.
    await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => undefined))));

    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${test.title || "MathTest"}.pdf`)}`,
      },
    });
  } catch (error) {
    console.error("PDF generation failed", error);
    return Response.json({ error: "pdf failed" }, { status: 500 });
  } finally {
    await page.close();
  }
}
