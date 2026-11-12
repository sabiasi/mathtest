/**
 * Creates a random, unique id like "3f2b8c1e-…".
 *
 * `crypto.randomUUID()` only exists on secure pages (https:// or localhost).
 * When you open the dev server from a phone via your computer's IP address,
 * the page is plain http://, so we fall back to building an id ourselves.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
