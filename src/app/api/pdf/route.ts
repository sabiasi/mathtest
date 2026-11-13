/**
 * POST /api/pdf  { test, version, variant, language, images }  →  the PDF file
 *
 * How it works: the page sends the test (exactly as the teacher sees it).
 * We open an invisible Chrome, hand it the test and pictures, open our own
 * /print page, wait until the pages are laid out, and ask Chrome to "print
 * to PDF". Chrome embeds the fonts (Noto Sans Georgian, the math fonts).
 *
 * Guests (no account) may use it too, so they can try everything. Because
 * every PDF costs the server real work, there are limits (see rateLimit.ts):
 * per visitor per 10 minutes, for all guests together, and how many PDFs are
 * made at the same time. The invisible Chrome itself is NOT signed in: it
 * gets the test handed over, so no sign-in cookie ever leaves the browser.
 *
 * Plans: what the teacher's plan allows (number of variants, the "Made with
 * MathTest" footer on Free) is worked out HERE from the database and handed
 * to that Chrome too, so it can't be changed from the browser.
 */
import { LANGUAGES, type Language } from "@/i18n/dictionaries";
import { getBrowser } from "@/lib/server/chrome";
import { serverEntitlements } from "@/lib/plans/server";
import type { Entitlements } from "@/lib/plans/entitlements";
import { VARIANT_LABELS } from "@/lib/variants";
import { clientIp, createConcurrencyLimit, createRateLimiter, type LimitResult } from "@/lib/server/rateLimit";
import { normalizeTest } from "@/lib/storage/migrate";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server";

const LANGUAGE_KEY = "mathtest:language";
const THEME_KEY = "mathtest:theme"; // same as THEME_STORAGE_KEY in components/Providers.tsx

const TEN_MINUTES = 10 * 60 * 1000;
/** Each guest (by IP address): 10 PDFs per 10 minutes. */
const perGuest = createRateLimiter({ limit: 10, windowMs: TEN_MINUTES });
/** All guests together — in case someone fakes many different addresses. */
const allGuests = createRateLimiter({ limit: 200, windowMs: TEN_MINUTES });
/** Each signed-in teacher: 40 PDFs per 10 minutes (plenty for real work). */
const perTeacher = createRateLimiter({ limit: 40, windowMs: TEN_MINUTES });
/** Every PDF opens a Chrome tab; more at once would slow everyone down. */
const parallel = createConcurrencyLimit(3);

/** A test with pictures is a few MB at most; refuse anything far bigger. */
const MAX_BODY_BYTES = 25 * 1024 * 1024;
const MAX_QUESTIONS = 300;

const refuse = (status: number, error: string, retryAfterSeconds?: number) =>
  Response.json({ error }, { status, headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined });

export async function POST(request: Request) {
  // ---- Who is asking, and have they asked too often? ----
  let userId: string | null = null;
  let supabase: Awaited<ReturnType<typeof createSupabaseServer>> | null = null;
  if (supabaseConfigured) {
    supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getClaims();
    userId = data?.claims?.sub ?? null;
  }
  let limit: LimitResult;
  if (userId) limit = perTeacher.check(`user:${userId}`);
  else {
    limit = perGuest.check(`ip:${clientIp(request.headers)}`);
    if (limit.ok) limit = allGuests.check("all");
  }
  if (!limit.ok) return refuse(429, "too many requests", limit.retryAfterSeconds);

  // ---- Read and check what was sent ----
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return refuse(413, "too big");
  const text = await request.text().catch(() => "");
  if (text.length > MAX_BODY_BYTES) return refuse(413, "too big");
  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = null;
  }
  const test = normalizeTest(body?.test);
  const version = body?.version === "key" ? "key" : "student";
  // What the plan allows (guests: Free).
  const entitlements = await serverEntitlements(supabase, userId);
  // "A"…"F" or "all" — anything else (or a variant beyond the plan's limit) falls back to "A".
  const allowedLabels: readonly string[] = VARIANT_LABELS.slice(0, entitlements.limits.maxVariants);
  const asked = typeof body?.variant === "string" ? body.variant : "";
  const variant = asked === "all" || allowedLabels.includes(asked) ? asked : "A";
  const language: Language = LANGUAGES.includes(body?.language as Language) ? (body!.language as Language) : "ka";
  if (!test) return refuse(400, "invalid test");
  if (test.questions.length > MAX_QUESTIONS) return refuse(413, "too many questions");
  // Pictures: { imageId: "data:image/png;base64,…" }. Only image data URLs are accepted.
  const images: Record<string, string> = {};
  if (body?.images && typeof body.images === "object") {
    for (const [id, url] of Object.entries(body.images as Record<string, unknown>)) {
      if (typeof url === "string" && /^data:image\/(png|jpeg|svg\+xml);base64,/.test(url)) images[id] = url;
    }
  }

  // ---- Make the PDF (only a few at a time) ----
  const done = parallel.tryStart();
  if (!done) return refuse(503, "busy", 5);
  try {
    return await makePdf(request, test, version, variant, language, images, entitlements);
  } finally {
    done();
  }
}

async function makePdf(
  request: Request,
  test: NonNullable<ReturnType<typeof normalizeTest>>,
  version: string,
  variant: string,
  language: Language,
  images: Record<string, string>,
  entitlements: Entitlements,
): Promise<Response> {
  let browser;
  try {
    browser = await getBrowser();
  } catch {
    // No Chrome on this machine: the page falls back to the print dialog.
    return refuse(501, "chrome not available");
  }

  const page = await browser.newPage();
  try {
    // Wide enough that the preview isn't shrunk to fit.
    await page.setViewport({ width: 1280, height: 1000 });
    // Paper is always white: open the page in light mode, whatever the teacher uses.
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
    // Runs before the page's own code: give this browser the test and language.
    await page.evaluateOnNewDocument(
      (testJson, languageKey, lang, themeKey, pictures, allowed) => {
        window.__MATHTEST_PRINT__ = { test: JSON.parse(testJson), entitlements: allowed };
        localStorage.setItem(languageKey, lang);
        localStorage.setItem(themeKey, "light");
        window.__MATHTEST_IMAGES__ = pictures;
      },
      JSON.stringify(test),
      LANGUAGE_KEY,
      language,
      THEME_KEY,
      images,
      entitlements,
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
    return refuse(500, "pdf failed");
  } finally {
    await page.close();
  }
}
