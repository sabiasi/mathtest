"use client";

import type { Language } from "@/i18n/dictionaries";
import type { Test } from "@/lib/storage/types";
import type { PrintVersion } from "./PrintBlocks";

/**
 * Asks our server (/api/pdf) to turn the print page into a PDF, then saves
 * the file. The server opens THIS SAME page in an invisible Chrome, so the
 * PDF looks exactly like the preview. Throws if the server can't do it.
 */
export async function downloadPdf(
  test: Test,
  version: PrintVersion,
  /** "A"…"F", or "all" for every variant in one file. */
  variant: string,
  language: Language,
  fileName: string,
) {
  const response = await fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ test, version, variant, language }),
  });
  if (!response.ok) throw new Error(`PDF failed: ${response.status}`);

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
}

/** A file name that's safe on Windows and Mac: "ალგებრა — მოსწავლე.pdf". */
export function pdfFileName(title: string, suffix: string) {
  const safe = title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "MathTest";
  return `${safe} — ${suffix}.pdf`;
}
