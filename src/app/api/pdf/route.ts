/**
 * POST /api/pdf  { test, version, variant, language, images }  →  the PDF file
 *
 * How it works: the page sends the test (exactly as the teacher sees it).
 * We open an invisible Chrome, hand it the test and pictures, open our own
 * /print page, wait until the pages are laid out, and ask Chrome to "print
 * to PDF". Chrome embeds the fonts (Noto Sans Georgian, the math fonts).
 *
 * Only signed-in teachers may use it. The invisible Chrome itself is NOT
 * signed in: it gets the test handed over, so no sign-in cookie ever leaves
 * the teacher's browser.
 */
import { LANGUAGES, type Language } from "@/i18n/dictionaries";
import { getBrowser } from "@/lib/server/chrome";
import { normalizeTest } from "@/lib/storage/migrate";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server";

const LANGUAGE_KEY = "mathtest:language";
const THEME_KEY = "mathtest:theme"; // same as THEME_STORAGE_KEY in components/Providers.tsx

export async function POST(request: Request) {
  if (supabaseConfigured) {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims?.sub) return Response.json({ error: "sign in first" }, { status: 401 });
  }
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
    // Paper is always white: open the page in light mode, whatever the teacher uses.
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    // Lets this request past the "please sign in" redirect in proxy.ts.
    await page.setExtraHTTPHeaders({ "x-mathtest-pdf": "1" });
    // Runs before the page's own code: give this browser the test and language.
    await page.evaluateOnNewDocument(
      (testJson, languageKey, lang, themeKey, pictures) => {
        window.__MATHTEST_PRINT__ = { test: JSON.parse(testJson) };
        localStorage.setItem(languageKey, lang);
        localStorage.setItem(themeKey, "light");
        window.__MATHTEST_IMAGES__ = pictures;
      },
      JSON.stringify(test),
      LANGUAGE_KEY,
      language,
      THEME_KEY,
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
