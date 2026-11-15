"use client";

/**
 * Talking to our school / admin routes (/api/school/…, /api/admin/…).
 * Every answer is either { ok: true, body } or { ok: false, error }, where
 * `error` is one of the codes in lib/schools/http.ts — each has a Georgian
 * message `school.error.<code>`.
 */
export type ApiFailure = "signIn" | "forbidden" | "notFound" | "invalid" | "tooMany" | "notReady" | "disabled" | "full" | "failed" | "network";
export type ApiAnswer<T> = { ok: true; body: T } | { ok: false; error: ApiFailure };

const KNOWN: ApiFailure[] = ["signIn", "forbidden", "notFound", "invalid", "tooMany", "notReady", "disabled", "full", "failed"];

async function call<T>(path: string, init?: RequestInit): Promise<ApiAnswer<T>> {
  try {
    const response = await fetch(path, { cache: "no-store", ...init });
    const body = (await response.json().catch(() => ({}))) as T & { error?: unknown };
    if (!response.ok) return { ok: false, error: KNOWN.includes(body.error as ApiFailure) ? (body.error as ApiFailure) : "failed" };
    return { ok: true, body };
  } catch {
    return { ok: false, error: "network" };
  }
}

export const apiGet = <T>(path: string) => call<T>(path);
export const apiPost = <T>(path: string, body: Record<string, unknown> = {}) =>
  call<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
