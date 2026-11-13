/**
 * The School plan request form (/pricing): checking what was sent before it
 * goes into the database. Used by /api/school-request (the server) — the
 * database checks the lengths once more (supabase/schema.sql).
 */
import type { Language } from "@/i18n/dictionaries";

export type SchoolRequest = {
  contact_name: string;
  school_name: string;
  city: string;
  teachers: number | null;
  email: string;
  phone: string;
  message: string;
  language: Language;
};

const clean = (value: unknown, max: number) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "");

/** A simple "looks like an email" check (the real check is that we can write back). */
export const looksLikeEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** The cleaned request, or null when the name, school or email is missing/invalid. */
export function parseSchoolRequest(body: Record<string, unknown> | null): SchoolRequest | null {
  if (!body) return null;
  const teachersNumber = Number(body.teachers);
  const request: SchoolRequest = {
    contact_name: clean(body.contact_name, 200),
    school_name: clean(body.school_name, 300),
    city: clean(body.city, 100),
    teachers: Number.isInteger(teachersNumber) && teachersNumber >= 1 && teachersNumber <= 10_000 ? teachersNumber : null,
    email: clean(body.email, 320),
    phone: clean(body.phone, 40),
    // The message keeps its line breaks.
    message: typeof body.message === "string" ? body.message.trim().slice(0, 3000) : "",
    language: body.language === "en" ? "en" : "ka",
  };
  if (!request.contact_name || !request.school_name || !looksLikeEmail(request.email)) return null;
  return request;
}
