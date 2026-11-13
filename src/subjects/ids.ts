/**
 * The school subjects MathTest supports, as short ids ("math", "physics"…).
 *
 * This file is plain data (no React), so saved-data code like migrate.ts can
 * use it. The toolkits themselves (icons, toolbars…) are in registry.ts.
 *
 * Adding a subject (e.g. geography) — the steps are listed in registry.ts.
 */
import { dictionaries } from "@/i18n/dictionaries";

/** In the order the subject picker shows them. */
export const SUBJECT_IDS = ["math", "physics", "chemistry", "biology", "history", "georgian", "english"] as const;
export type SubjectId = (typeof SUBJECT_IDS)[number];

/** Tests saved before subjects existed were all math tests. */
export const DEFAULT_SUBJECT: SubjectId = "math";

export function isSubjectId(value: unknown): value is SubjectId {
  return typeof value === "string" && (SUBJECT_IDS as readonly string[]).includes(value);
}

/** Other ways teachers write a subject's name (to recognise old tests and profiles). */
const ALIASES: Record<SubjectId, string[]> = {
  math: ["მათემატიკა", "ალგებრა", "გეომეტრია", "math", "maths", "algebra", "geometry"],
  physics: ["ფიზიკა"],
  chemistry: ["ქიმია"],
  biology: ["ბიოლოგია", "biology"],
  history: ["ისტორია", "საქართველოს ისტორია", "მსოფლიო ისტორია"],
  georgian: ["ქართული", "ქართული ენა", "ქართული ლიტერატურა", "ლიტერატურა", "georgian", "literature"],
  english: ["ინგლისური", "ინგლისური ენა", "english", "english language", "efl"],
};

const simplify = (text: string) => text.trim().toLocaleLowerCase().replace(/\s+/g, " ");

/**
 * Which subject a free-text name means: "ფიზიკა" → "physics",
 * "Mathematics" → "math". null when it doesn't match any subject.
 */
export function subjectFromText(text: string): SubjectId | null {
  const wanted = simplify(text);
  if (!wanted) return null;
  for (const id of SUBJECT_IDS) {
    const names = [id, dictionaries.ka[`subject.${id}`], dictionaries.en[`subject.${id}`], ...ALIASES[id]];
    if (names.some((name) => simplify(name) === wanted)) return id;
  }
  return null;
}
