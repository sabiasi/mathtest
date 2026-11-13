"use client";

/**
 * Where pictures are stored.
 *
 * - In the cloud: Supabase Storage, bucket "images", in a folder named after
 *   the teacher's user id:  images/<user id>/<picture id>. Only that teacher
 *   can read or change their folder (rules in supabase/schema.sql).
 * - In the browser: a copy in IndexedDB (the browser's built-in database for
 *   bigger things), so pictures show instantly and uploads can be retried if
 *   the internet drops. Store "cache", key "<user id>/<picture id>".
 * - Guests (no account): store "images" in IndexedDB is the ONLY copy (it
 *   also holds pictures from before accounts existed). When the guest signs
 *   in, the pictures their tests use are uploaded and removed from there.
 *
 * Tests only keep the picture's id. IndexedDB's own API is old-fashioned
 * (events instead of promises), so the helpers below wrap it in promises.
 */
import { newId } from "@/lib/ids";
import type { Test } from "@/lib/storage/types";
import { IMAGE_BUCKET } from "@/lib/supabase/config";
import { getSupabase } from "@/lib/supabase/client";
import { ACCEPTED_TYPES, outputType, targetSize, unusedImageIds, usedImageIds } from "./imageMath";

const DB_NAME = "mathtest";
/** Guests' pictures (and pictures from before accounts). */
const DEVICE_STORE = "images";
const CACHE_STORE = "cache";

type DeviceImage = { id: string; blob: Blob; width: number; height: number; createdAt: number };
type CachedImage = { key: string; userId: string; id: string; blob: Blob; uploaded: boolean; createdAt: number };

declare global {
  interface Window {
    /** Set by the PDF server: pictures sent along with the test (id → data URL). */
    __MATHTEST_IMAGES__?: Record<string, string>;
  }
}

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    // Version 2 added the "cache" store (version 1 only had "images").
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DEVICE_STORE)) db.createObjectStore(DEVICE_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

/** Runs one request against a store and returns its result as a promise. */
async function run<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(storeName, mode).objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const cacheKey = (userId: string, id: string) => `${userId}/${id}`;

// ---------------------------------------------------------------------------
// Who is signed in (set by the sign-in code)
// ---------------------------------------------------------------------------

let currentUserId: string | null = null;

/** Called on sign-in (with the user id) and for guests (null). */
export function setImageUser(userId: string | null): void {
  currentUserId = userId;
  urlCache.clear();
  if (userId) void retryUploads(userId);
}

function requireUser(): string {
  if (!currentUserId) throw new Error("not signed in");
  return currentUserId;
}

/** Guest: keep the picture in this browser only. */
async function storeOnDevice(id: string, blob: Blob, width: number, height: number): Promise<void> {
  const entry: DeviceImage = { id, blob, width, height, createdAt: Date.now() };
  await run(DEVICE_STORE, "readwrite", (store) => store.put(entry));
}

// ---------------------------------------------------------------------------
// Uploading
// ---------------------------------------------------------------------------

async function upload(userId: string, id: string, blob: Blob): Promise<void> {
  const { error } = await getSupabase()
    .storage.from(IMAGE_BUCKET)
    .upload(`${userId}/${id}`, blob, { contentType: blob.type, upsert: true, cacheControl: "31536000" });
  if (error) throw error;
}

/** Uploads pictures that couldn't be sent earlier (e.g. no internet then). */
async function retryUploads(userId: string): Promise<void> {
  try {
    const all = await run<CachedImage[]>(CACHE_STORE, "readonly", (store) => store.getAll());
    for (const image of all.filter((i) => i.userId === userId && !i.uploaded)) {
      await upload(userId, image.id, image.blob);
      await run(CACHE_STORE, "readwrite", (store) => store.put({ ...image, uploaded: true }));
    }
  } catch {
    // Still offline — the next sign-in or page load tries again.
  }
}

/** Uploads a picture now; if that fails, keeps it marked "not uploaded" and retries in the background. */
async function storeAndUpload(userId: string, id: string, blob: Blob): Promise<void> {
  const entry: CachedImage = { key: cacheKey(userId, id), userId, id, blob, uploaded: false, createdAt: Date.now() };
  await run(CACHE_STORE, "readwrite", (store) => store.put(entry)).catch(() => undefined);
  try {
    await upload(userId, id, blob);
    await run(CACHE_STORE, "readwrite", (store) => store.put({ ...entry, uploaded: true })).catch(() => undefined);
  } catch {
    setTimeout(() => void retryUploads(userId), 10_000);
  }
}

// ---------------------------------------------------------------------------
// Adding a picture
// ---------------------------------------------------------------------------

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
  if (currentUserId) await storeAndUpload(currentUserId, id, blob);
  else await storeOnDevice(id, blob, width, height);
  return { imageId: id, width, height };
}

// ---------------------------------------------------------------------------
// Showing a picture
// ---------------------------------------------------------------------------

/** The picture's data: from the browser copy, or downloaded from the cloud (and then kept). */
async function getBlob(id: string): Promise<Blob | null> {
  const userId = currentUserId;
  if (!userId) {
    const own = await run<DeviceImage | undefined>(DEVICE_STORE, "readonly", (store) => store.get(id)).catch(() => undefined);
    return own?.blob ?? null;
  }
  const cached = await run<CachedImage | undefined>(CACHE_STORE, "readonly", (store) => store.get(cacheKey(userId, id))).catch(
    () => undefined,
  );
  if (cached) return cached.blob;
  const { data, error } = await getSupabase().storage.from(IMAGE_BUCKET).download(`${userId}/${id}`);
  if (error || !data) return null;
  const entry: CachedImage = { key: cacheKey(userId, id), userId, id, blob: data, uploaded: true, createdAt: Date.now() };
  await run(CACHE_STORE, "readwrite", (store) => store.put(entry)).catch(() => undefined);
  return data;
}

// Object URLs ("blob:…") let an <img> show a stored picture. Make each once.
const urlCache = new Map<string, Promise<string | null>>();

export function getImageUrl(imageId: string): Promise<string | null> {
  const injected = typeof window !== "undefined" ? window.__MATHTEST_IMAGES__?.[imageId] : undefined;
  if (injected) return Promise.resolve(injected);
  let url = urlCache.get(imageId);
  if (!url) {
    url = getBlob(imageId)
      .then((blob) => (blob ? URL.createObjectURL(blob) : null))
      .catch(() => null);
    // Don't remember "not found" — it may be uploaded from another computer soon.
    url.then((value) => value === null && urlCache.delete(imageId));
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
  const result: Record<string, string> = {};
  for (const id of usedImageIds([test])) {
    const blob = await getBlob(id);
    if (blob) result[id] = await toDataUrl(blob);
  }
  return result;
}

// ---------------------------------------------------------------------------
// A guest signs in: their pictures → the cloud
// ---------------------------------------------------------------------------

/**
 * Copies the pictures used by `tests` from this browser's guest store to the
 * teacher's cloud folder (and the browser copy of it). If the internet is
 * down, they wait in the browser copy and are uploaded later.
 */
export async function moveDeviceImagesToAccount(tests: Test[]): Promise<void> {
  const userId = requireUser();
  for (const id of usedImageIds(tests)) {
    const own = await run<DeviceImage | undefined>(DEVICE_STORE, "readonly", (store) => store.get(id)).catch(() => undefined);
    if (own) await storeAndUpload(userId, id, own.blob);
  }
}

/** Removes the guest copies of these tests' pictures (after they were moved). */
export async function removeDeviceImages(tests: Test[]): Promise<void> {
  for (const id of usedImageIds(tests)) {
    await run(DEVICE_STORE, "readwrite", (store) => store.delete(id)).catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Tidying up
// ---------------------------------------------------------------------------

let lastCleanUp = 0;

/**
 * Deletes the teacher's pictures that no test uses any more (e.g. after
 * deleting a test), in the cloud and in the browser copy. Pictures younger
 * than 10 minutes are kept (Undo, or a test that's still being saved).
 * Runs at most every 10 minutes.
 */
export async function cleanUpImages(tests: Test[]): Promise<number> {
  const userId = currentUserId;
  if (Date.now() - lastCleanUp < 10 * 60 * 1000) return 0;
  lastCleanUp = Date.now();
  if (!userId) return cleanUpDeviceImages(tests);
  try {
    const { data, error } = await getSupabase().storage.from(IMAGE_BUCKET).list(userId, { limit: 1000 });
    if (error || !data) return 0;
    const stored = data.map((file) => ({ id: file.name, createdAt: Date.parse(file.created_at ?? "") || Date.now() }));
    const unused = unusedImageIds(stored, tests, Date.now());
    if (unused.length > 0) {
      await getSupabase()
        .storage.from(IMAGE_BUCKET)
        .remove(unused.map((id) => `${userId}/${id}`));
      for (const id of unused) {
        await run(CACHE_STORE, "readwrite", (store) => store.delete(cacheKey(userId, id))).catch(() => undefined);
        urlCache.delete(id);
      }
    }
    return unused.length;
  } catch {
    return 0;
  }
}

/** The same for a guest's pictures in this browser. */
async function cleanUpDeviceImages(tests: Test[]): Promise<number> {
  try {
    const all = await run<DeviceImage[]>(DEVICE_STORE, "readonly", (store) => store.getAll());
    const unused = unusedImageIds(all, tests, Date.now());
    for (const id of unused) {
      await run(DEVICE_STORE, "readwrite", (store) => store.delete(id));
      urlCache.delete(id);
    }
    return unused.length;
  } catch {
    return 0;
  }
}

/** Sign-out: removes this browser's copies of the teacher's pictures (shared school computers). */
export async function clearImageCache(): Promise<void> {
  urlCache.clear();
  try {
    const all = await run<CachedImage[]>(CACHE_STORE, "readonly", (store) => store.getAll());
    // Keep pictures that never reached the cloud — deleting them would lose them.
    for (const image of all.filter((i) => i.uploaded)) {
      await run(CACHE_STORE, "readwrite", (store) => store.delete(image.key));
    }
  } catch {
    // IndexedDB unavailable: nothing to clear
  }
}
