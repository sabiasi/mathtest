"use client";

import type { Language } from "@/i18n/dictionaries";
import { imageDataUrl, imagesForTest } from "@/lib/images/imageStore";
import type { PaperHeader } from "@/lib/paperHeader";
import type { Test } from "@/lib/storage/types";
import type { PrintVersion } from "./PrintBlocks";

/** The server said no: `status` 429 = too many PDFs (wait `retryAfterSeconds`), 503 = busy, 413 = too big… */
export class PdfError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfterSeconds: number | null,
  ) {
    super(`PDF failed: ${status}`);
  }
}

/**
 * Asks our server (/api/pdf) to turn the print page into a PDF, then saves
 * the file. The server opens THIS SAME page in an invisible Chrome, so the
 * PDF looks exactly like the preview. Throws if the server can't do it.
 */
export function downloadPdf(test: Test, version: PrintVersion, variant: string, language: Language, fileName: string, paperHeader: PaperHeader | null = null) {
  return downloadFile("/api/pdf", test, version, variant, language, fileName, paperHeader);
}

/**
 * The same for a Word file (/api/docx, Premium). Resolves false when the file
 * was made but some questions couldn't be included as pictures.
 */
export async function downloadDocx(test: Test, version: PrintVersion, variant: string, language: Language, fileName: string, paperHeader: PaperHeader | null = null): Promise<boolean> {
  const response = await downloadFile("/api/docx", test, version, variant, language, fileName, paperHeader);
  return response.headers.get("X-Docx-Complete") !== "0";
}

async function downloadFile(
  route: "/api/pdf" | "/api/docx",
  test: Test,
  version: PrintVersion,
  /** "A"…"F", or "all" for every variant in one file. */
  variant: string,
  language: Language,
  fileName: string,
  /** The teacher's own paper header; the server prints it only if the plan allows. */
  paperHeader: PaperHeader | null = null,
) {
  // Pictures live in this browser's IndexedDB, so they travel with the request — the header's logo too.
  const images = await imagesForTest(test);
  if (paperHeader?.logoImageId) {
    const logo = await imageDataUrl(paperHeader.logoImageId);
    if (logo) images[paperHeader.logoImageId] = logo;
  }
  const response = await fetch(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ test, version, variant, language, images, paperHeader }),
  });
  if (!response.ok) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    throw new PdfError(response.status, retryAfter > 0 ? retryAfter : null);
  }

  const blob = await response.blob();
  // Make a temporary link to the file and "click" it to start the download.
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return response;
}

/** Resolves once every picture on the page has loaded (so nothing prints blank). */
export function waitForImages(): Promise<unknown> {
  return Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
}

/** A file name that's safe on Windows and Mac: "ალგებრა — მოსწავლე.pdf". */
export function pdfFileName(title: string, suffix: string, extension: "pdf" | "docx" = "pdf") {
  const safe = title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "Rapido";
  return `${safe} — ${suffix}.${extension}`;
}
