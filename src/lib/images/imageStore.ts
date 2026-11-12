"use client";

/**
 * Where pictures are stored: the browser's IndexedDB.
 *
 * localStorage (where tests live) only holds ~5 MB in total — a few photos
 * would fill it. IndexedDB is the browser's built-in database for bigger
 * things and usually allows hundreds of MB. Tests only keep the picture's id.
 *
 * IndexedDB's own API is old-fashioned (events instead of promises), so the
 * small helpers below wrap it in promises, which are easier to use.
 */
import { newId } from "@/lib/ids";
import type { Test } from "@/lib/storage/types";
import { ACCEPTED_TYPES, outputType, targetSize, unusedImageIds } from "./imageMath";

const DB_NAME = "mathtest";
const STORE = "images";

type StoredImage = { id: string; blob: Blob; width: number; height: number; createdAt: number };

declare global {
  interface Window {
    /** Set by the PDF server: pictures sent along with the test (id → data URL). */
    __MATHTEST_IMAGES__?: Record<string, string>;
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

/** Runs one request against the store and returns its result as a promise. */
async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Loads a picture into an <img> to learn its size (works for SVG too). */
function measure(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || 400, height: img.naturalHeight || 300 });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("not an image"));
    };
    img.src = url;
  });
}

export class UnsupportedImageError extends Error {}

/**
 * Saves a picture the teacher uploaded or pasted. Very large photos are
 * scaled down (see imageMath.ts); SVG drawings are kept exactly as they are,
 * because they stay sharp at any size.
 */
export async function addImage(file: Blob): Promise<{ imageId: string; width: number; height: number }> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new UnsupportedImageError(file.type);

  let blob: Blob = file;
  let { width, height } = await measure(file).catch(() => {
    throw new UnsupportedImageError(file.type);
  });

  if (file.type !== "image/svg+xml") {
    const target = targetSize(width, height);
    const needsRedraw = target.scaled || (file.type !== "image/png" && file.type !== "image/jpeg");
    if (needsRedraw) {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = target.width;
      canvas.height = target.height;
      const context = canvas.getContext("2d")!;
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, target.width, target.height);
      blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), outputType(file.type), 0.92),
      );
      ({ width, height } = target);
    }
  }

  const id = newId();
  await run("readwrite", (store) => store.put({ id, blob, width, height, createdAt: Date.now() } satisfies StoredImage));
  return { imageId: id, width, height };
}

// Object URLs ("blob:…") let an <img> show a stored picture. Make each once.
const urlCache = new Map<string, Promise<string | null>>();

export function getImageUrl(imageId: string): Promise<string | null> {
  const injected = typeof window !== "undefined" ? window.__MATHTEST_IMAGES__?.[imageId] : undefined;
  if (injected) return Promise.resolve(injected);
  let url = urlCache.get(imageId);
  if (!url) {
    url = run<StoredImage | undefined>("readonly", (store) => store.get(imageId))
      .then((stored) => (stored ? URL.createObjectURL(stored.blob) : null))
      .catch(() => null);
    urlCache.set(imageId, url);
  }
  return url;
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** The test's pictures as text ("data URLs"), to send to the PDF server. */
export async function imagesForTest(test: Test): Promise<Record<string, string>> {
  const ids = new Set(test.questions.flatMap((q) => q.images.map((i) => i.imageId)));
  const result: Record<string, string> = {};
  for (const id of ids) {
    const stored = await run<StoredImage | undefined>("readonly", (store) => store.get(id));
    if (stored) result[id] = await toDataUrl(stored.blob);
  }
  return result;
}

/** Deletes pictures no test uses any more (e.g. after deleting a test). */
export async function cleanUpImages(tests: Test[]): Promise<number> {
  try {
    const stored = await run<StoredImage[]>("readonly", (store) => store.getAll());
    const unused = unusedImageIds(stored, tests, Date.now());
    for (const id of unused) {
      await run("readwrite", (store) => store.delete(id));
      urlCache.delete(id);
    }
    return unused.length;
  } catch {
    return 0; // IndexedDB unavailable (e.g. some private modes): nothing to clean
  }
}
