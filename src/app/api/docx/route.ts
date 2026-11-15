/**
 * POST /api/docx  { test, version, variant, language, images, paperHeader }  →  a Word (.docx) file
 *
 * A Premium feature, so everything is decided HERE: the teacher must be
 * signed in and the plan must include Word export (read from the database).
 * Simple questions become real Word text with Word equations; the rest are
 * pictures of the printed question, taken by the same invisible Chrome that
 * makes PDFs. Without Chrome the file is still made (those questions carry a
 * short note instead).
 *
 * Limits: 20 files / 10 minutes per teacher, 2 being made at once.
 */
import { LANGUAGES, type Language } from "@/i18n/dictionaries";
import { buildDocx } from "@/lib/docx/document";
import { needsPicture, testToBlocks, type BlockPictures, type DocxVersion } from "@/lib/docx/fromTest";
import { shootBlocks, type Wanted } from "@/lib/docx/shoot";
import { activePaperHeader } from "@/lib/paperHeader";
import { READY } from "@/lib/plans/plans";
import { serverDb } from "@/lib/server/db";
import { clientIp, createConcurrencyLimit, createRateLimiter } from "@/lib/server/rateLimit";
import { normalizeTest } from "@/lib/storage/migrate";
import type { Question } from "@/lib/storage/types";
import { buildVariants } from "@/lib/variants";
import { printBlocks } from "@/features/print/blocks";
import { getToolkit } from "@/subjects/registry";

const TEN_MINUTES = 10 * 60 * 1000;
const perTeacher = createRateLimiter({ limit: 20, windowMs: TEN_MINUTES });
/** Also per address, before we even look who it is (stops hammering with bad sign-ins). */
const perIp = createRateLimiter({ limit: 60, windowMs: TEN_MINUTES });
const parallel = createConcurrencyLimit(2);

const MAX_BODY_BYTES = 25 * 1024 * 1024;
const MAX_QUESTIONS = 300;
/** At most this many question pictures per file (each one is a screenshot). */
const MAX_PICTURES = 400;

const refuse = (status: number, error: string, retryAfterSeconds?: number) =>
  Response.json({ error }, { status, headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined });

/** The print blocks of each question, in order: question id → block keys. */
function blockKeys(questions: Question[], version: DocxVersion): Map<string, string[]> {
  const keys = new Map<string, string[]>();
  for (const block of printBlocks(questions, version)) keys.set(block.question.id, [...(keys.get(block.question.id) ?? []), block.key]);
  return keys;
}

export async function POST(request: Request) {
  const ip = perIp.check(clientIp(request.headers));
  if (!ip.ok) return refuse(429, "tooMany", ip.retryAfterSeconds);
  if (!READY.docxExport) return refuse(404, "notFound");

  // ---- Who is asking, and does their plan include Word export? ----
  const db = await serverDb().catch(() => null);
  if (!db?.user) return refuse(401, "signIn");
  const limit = perTeacher.check(db.user.id);
  if (!limit.ok) return refuse(429, "tooMany", limit.retryAfterSeconds);
  const entitlements = await db.entitlements();
  if (!entitlements.features.docxExport) return refuse(403, "premium");

  // ---- Read and check what was sent ----
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return refuse(413, "tooBig");
  const text = await request.text().catch(() => "");
  if (text.length > MAX_BODY_BYTES) return refuse(413, "tooBig");
  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = null;
  }
  const test = normalizeTest(body?.test);
  if (!test) return refuse(400, "invalid");
  if (test.questions.length > MAX_QUESTIONS) return refuse(413, "tooBig");
  const version: DocxVersion = body?.version === "key" ? "key" : "student";
  const language: Language = LANGUAGES.includes(body?.language as Language) ? (body!.language as Language) : "ka";
  const images: Record<string, string> = {};
  if (body?.images && typeof body.images === "object") {
    for (const [id, url] of Object.entries(body.images as Record<string, unknown>)) {
      if (typeof url === "string" && /^data:image\/(png|jpeg|svg\+xml);base64,/.test(url)) images[id] = url;
    }
  }
  const paperHeader = READY.customHeader ? activePaperHeader(body?.paperHeader, entitlements.features.customHeader) : null;

  // Which variants: "A"…"F" or "all", never more than the plan allows.
  const all = buildVariants(test, entitlements.limits.maxVariants);
  const asked = typeof body?.variant === "string" ? body.variant : "A";
  const variants = asked === "all" ? all : [all.find((variant) => variant.label === asked) ?? all[0]];

  const done = parallel.tryStart();
  if (!done) return refuse(503, "busy", 5);
  try {
    // ---- Pictures of the questions Word can't hold as text ----
    const wanted: Wanted[] = [];
    let count = 0;
    for (const variant of variants) {
      const keysOf = blockKeys(variant.test.questions, version);
      const keys = variant.test.questions.filter((question) => needsPicture(question, images)).flatMap((question) => keysOf.get(question.id) ?? []);
      const room = keys.slice(0, Math.max(0, MAX_PICTURES - count));
      count += room.length;
      if (room.length > 0) wanted.push({ variant: variant.label, version, keys: room });
    }
    let pictures: BlockPictures = {};
    let complete = true;
    try {
      pictures = await shootBlocks(new URL(request.url).origin, test, wanted, { language, images, entitlements, paperHeader });
    } catch (error) {
      // No Chrome here (or it failed): the file is still made, with a note where a picture is missing.
      complete = false;
      if (!(error instanceof Error && error.message === "CHROME_NOT_FOUND")) console.error("Word export: question pictures failed", error);
    }

    const file = buildDocx({
      title: test.title,
      language: getToolkit(test.subjectId).print.language === "en" ? "en-GB" : "ka-GE",
      blocks: testToBlocks({ variants, showVariant: all.length > 1, version, language, images, pictures, header: paperHeader, blockKeys }),
    });
    return new Response(Buffer.from(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${test.title || "MathTest"}.docx`)}`,
        "Cache-Control": "private, no-store",
        // The page tells the teacher when some questions couldn't be turned into pictures.
        "X-Docx-Complete": complete ? "1" : "0",
      },
    });
  } catch (error) {
    console.error("Word export failed", error instanceof Error ? error.message : error);
    return refuse(500, "failed");
  } finally {
    done();
  }
}
