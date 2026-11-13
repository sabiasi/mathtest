/**
 * Pure helpers for images (no browser needed, so they're easy to test).
 */
import type { Test } from "@/lib/storage/types";

/** ~2400 px is enough for a sharp full-width print at 300 dpi. */
export const MAX_IMAGE_SIDE = 2400;

/** Shrinks a size so its longer side is at most `max`, keeping the shape. */
export function targetSize(width: number, height: number, max = MAX_IMAGE_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale), scaled: scale < 1 };
}

/**
 * Which format to save a (re-drawn) picture in. Photos → JPEG (small files).
 * Everything else → PNG, which keeps diagram lines and text razor sharp
 * (JPEG would make them fuzzy).
 */
export function outputType(inputType: string): "image/png" | "image/jpeg" {
  return inputType === "image/jpeg" ? "image/jpeg" : "image/png";
}

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif"];

/** Ids of every stored picture used by any test: question pictures and maps (diagrams have none). */
export function usedImageIds(tests: Test[]): Set<string> {
  const used = new Set<string>();
  for (const test of tests) {
    for (const q of test.questions) {
      for (const image of q.images) if (image.imageId && !image.diagram) used.add(image.imageId);
      if (q.type === "map" && q.map) used.add(q.map.imageId);
      if (q.type === "picture-match") for (const picture of q.pictures) used.add(picture.imageId);
    }
  }
  return used;
}

/**
 * Stored pictures no test uses any more — except very new ones, which may
 * belong to an edit that hasn't been saved yet.
 */
export function unusedImageIds(
  stored: { id: string; createdAt: number }[],
  tests: Test[],
  now: number,
  graceMs = 10 * 60 * 1000,
): string[] {
  const used = usedImageIds(tests);
  return stored.filter((s) => !used.has(s.id) && now - s.createdAt > graceMs).map((s) => s.id);
}
