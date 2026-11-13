/**
 * Which pages need a signed-in teacher, and safe "come back here after
 * signing in" addresses. Used by proxy.ts (server) and the auth pages.
 */

/** Pages that need an account. Everything else (landing, about, sign-in…) is public. */
export const PROTECTED_PREFIXES = ["/tests", "/editor", "/print", "/settings"];

/** Pages that make no sense once signed in (they send you to My tests). */
export const SIGNED_OUT_ONLY = ["/", "/signin", "/signup"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Only allow going back to a page of OUR site. Without this check, a
 * crafted link like /signin?next=https://evil.example could send a teacher
 * to another website right after signing in ("open redirect").
 */
export function safeNext(next: string | null | undefined, fallback = "/tests"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
