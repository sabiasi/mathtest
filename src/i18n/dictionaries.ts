/**
 * Every piece of text the user sees lives here, in Georgian and English.
 * ("i18n" is short for "internationalization": i + 18 letters + n.)
 *
 * Georgian (ka) is the main language. English must have exactly the same
 * keys — TypeScript shows an error if one is missing.
 *
 * `{name}` marks a placeholder that gets filled in, e.g. {count} → 5.
 */

export const LANGUAGES = ["ka", "en"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "ka";

/** Each language's name, written in that language. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  ka: "ქართული",
  en: "English",
};

const ka = {
  "language.label": "ენა",

  "test.untitled": "უსათაურო ტესტი",

  "home.title": "ჩემი ტესტები",
  "home.subtitle":
    "შექმენით ტესტები, ქვიზები და საკონტროლო წერები, შემდეგ ამობეჭდეთ ან შეინახეთ PDF-ად.",
  "home.createNew": "ახალი ტესტის შექმნა",
  "home.emptyTitle": "ჯერ არცერთი ტესტი არ გაქვთ",
  "home.emptyText":
    "დაიწყეთ პირველი ტესტით: დაამატეთ კითხვები, ჩაწერეთ ფორმულები ღილაკებით და მოამზადეთ ბეჭდვისთვის.",
  "home.questionCount": "კითხვები: {count}",
  "home.updatedAt": "შეცვლილია: {date}",
  "home.delete": "ტესტის წაშლა",
  "home.deleteConfirm": "წავშალოთ ტესტი „{title}“? ამის გაუქმება შეუძლებელი იქნება.",
  "home.storageNote":
    "ტესტები ინახება მხოლოდ ამ კომპიუტერის ამ ბრაუზერში და სხვა მოწყობილობაზე არ გამოჩნდება.",

  "editor.back": "ჩემი ტესტები",
  "editor.comingSoonTitle": "რედაქტორი მზადდება",
  "editor.comingSoonText":
    "მალე აქ შეძლებთ ტესტის სათაურის, საგნის, კლასის, თარიღის, ინსტრუქციისა და კითხვების დამატებას.",
  "editor.notFoundTitle": "ტესტი ვერ მოიძებნა",
  "editor.notFoundText": "შესაძლოა, ეს ტესტი წაშლილია ან სხვა ბრაუზერშია შექმნილი.",
  "editor.backHome": "ჩემს ტესტებზე დაბრუნება",
};

export type MessageKey = keyof typeof ka;

const en: Record<MessageKey, string> = {
  "language.label": "Language",

  "test.untitled": "Untitled test",

  "home.title": "My tests",
  "home.subtitle": "Create tests, quizzes and exams, then print them or save them as PDF.",
  "home.createNew": "Create new test",
  "home.emptyTitle": "You don't have any tests yet",
  "home.emptyText":
    "Start your first test: add questions, write formulas with buttons and get it ready to print.",
  "home.questionCount": "Questions: {count}",
  "home.updatedAt": "Edited: {date}",
  "home.delete": "Delete test",
  "home.deleteConfirm": "Delete the test “{title}”? This can't be undone.",
  "home.storageNote":
    "Tests are saved only in this browser on this computer and won't appear on other devices.",

  "editor.back": "My tests",
  "editor.comingSoonTitle": "The editor is on its way",
  "editor.comingSoonText":
    "Soon you'll be able to add the test's title, subject, grade, date, instructions and questions here.",
  "editor.notFoundTitle": "Test not found",
  "editor.notFoundText": "It may have been deleted, or created in a different browser.",
  "editor.backHome": "Back to my tests",
};

export const dictionaries: Record<Language, Record<MessageKey, string>> = { ka, en };
