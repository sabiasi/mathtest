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
  "test.defaultSubject": "მათემატიკა",
  "test.copyTitle": "{title} (ასლი)",
  "test.points": "{points} ქულა",

  "home.title": "ჩემი ტესტები",
  "home.subtitle":
    "შექმენით ტესტები, ქვიზები და საკონტროლო წერები, შემდეგ ამობეჭდეთ ან შეინახეთ PDF-ად.",
  "home.createNew": "ახალი ტესტის შექმნა",
  "home.emptyTitle": "ჯერ არცერთი ტესტი არ გაქვთ",
  "home.emptyText":
    "დაიწყეთ პირველი ტესტით: დაამატეთ კითხვები, ჩაწერეთ ფორმულები ღილაკებით და მოამზადეთ ბეჭდვისთვის.",
  "home.questionCount": "კითხვები: {count}",
  "home.totalPoints": "ქულა: {points}",
  "home.updatedAt": "შეცვლილია: {date}",
  "home.edit": "რედაქტირება",
  "home.duplicate": "ასლი",
  "home.duplicateLabel": "ტესტის ასლის შექმნა",
  "home.delete": "ტესტის წაშლა",
  "home.deleteConfirm": "წავშალოთ ტესტი „{title}“? ამის გაუქმება შეუძლებელი იქნება.",
  "home.storageNote":
    "ტესტები ინახება მხოლოდ ამ კომპიუტერის ამ ბრაუზერში და სხვა მოწყობილობაზე არ გამოჩნდება.",

  "editor.back": "ჩემი ტესტები",
  "editor.saving": "ინახება…",
  "editor.saved": "შენახულია",
  "editor.total": "სულ: {points} ქულა",
  "editor.notFoundTitle": "ტესტი ვერ მოიძებნა",
  "editor.notFoundText": "შესაძლოა, ეს ტესტი წაშლილია ან სხვა ბრაუზერშია შექმნილი.",
  "editor.backHome": "ჩემს ტესტებზე დაბრუნება",

  "header.heading": "ტესტის მონაცემები",
  "header.schoolName": "სკოლის დასახელება",
  "header.optional": "არასავალდებულო",
  "header.schoolNamePlaceholder": "მაგ.: თბილისის №1 საჯარო სკოლა",
  "header.title": "ტესტის სათაური",
  "header.titlePlaceholder": "მაგ.: შემაჯამებელი წერა — წილადები",
  "header.subject": "საგანი",
  "header.grade": "კლასი",
  "header.gradePlaceholder": "მაგ.: მე-7 ბ",
  "header.date": "თარიღი",
  "header.timeLimit": "დრო (წუთი)",
  "header.timeLimitPlaceholder": "მაგ.: 45",
  "header.instructions": "ინსტრუქცია მოსწავლეებისთვის",
  "header.instructionsPlaceholder":
    "მაგ.: ყურადღებით წაიკითხეთ თითოეული დავალება. ღია კითხვებზე ჩაწერეთ სრული ამოხსნა.",
  "header.labelStyle": "პასუხების ნიშნები",
  "header.labelStyleHint": "არჩევითი კითხვების პასუხები აღინიშნება ასე.",

  "questions.heading": "კითხვები",
  "questions.empty": "ჯერ კითხვები არ არის. დაამატეთ პირველი კითხვა ქვემოთ მოცემული ღილაკებით.",
  "questions.add": "კითხვის დამატება",
  "questions.number": "კითხვა {number}",
  "questions.type": "კითხვის ტიპი",
  "questions.points": "ქულა",
  "questions.text": "კითხვის ტექსტი",
  "questions.textPlaceholder": "ჩაწერეთ კითხვა ან დავალება…",
  "questions.statementPlaceholder": "ჩაწერეთ დებულება, რომელიც სწორია ან მცდარი…",
  "questions.drag": "გადაადგილება (გადაათრიეთ ან გამოიყენეთ Space და ისრები)",
  "questions.duplicate": "ასლის გაკეთება",
  "questions.delete": "კითხვის წაშლა",
  "questions.deleteConfirm": "წავშალოთ კითხვა {number}?",

  "type.multiple-choice": "არჩევითი პასუხით",
  "type.true-false": "სწორია / მცდარია",
  "type.short-answer": "მოკლე პასუხი",
  "type.open-answer": "ღია კითხვა (ამოხსნით)",

  "mc.optionPlaceholder": "პასუხი {label}",
  "mc.markCorrect": "მონიშნეთ {label} როგორც სწორი პასუხი",
  "mc.correct": "სწორი",
  "mc.hint": "სწორი პასუხის მოსანიშნად დააჭირეთ ასოს.",
  "mc.noCorrect": "სწორი პასუხი ჯერ არ არის მონიშნული.",
  "mc.addOption": "პასუხის დამატება",
  "mc.removeOption": "პასუხის {label} წაშლა",

  "tf.correctAnswer": "სწორი პასუხი:",
  "tf.true": "სწორია",
  "tf.false": "მცდარია",

  "sa.answer": "სწორი პასუხი",
  "sa.answerHint": "ჩანს მხოლოდ პასუხების ფურცელზე",
  "sa.answerPlaceholder": "მაგ.: x = 4",

  "oa.lines": "ცარიელი ხაზები ამოხსნისთვის",
  "oa.preview": "ასე გამოჩნდება ფურცელზე:",
};

export type MessageKey = keyof typeof ka;

const en: Record<MessageKey, string> = {
  "language.label": "Language",

  "test.untitled": "Untitled test",
  "test.defaultSubject": "Mathematics",
  "test.copyTitle": "{title} (copy)",
  "test.points": "{points} pts",

  "home.title": "My tests",
  "home.subtitle": "Create tests, quizzes and exams, then print them or save them as PDF.",
  "home.createNew": "Create new test",
  "home.emptyTitle": "You don't have any tests yet",
  "home.emptyText":
    "Start your first test: add questions, write formulas with buttons and get it ready to print.",
  "home.questionCount": "Questions: {count}",
  "home.totalPoints": "Points: {points}",
  "home.updatedAt": "Edited: {date}",
  "home.edit": "Edit",
  "home.duplicate": "Duplicate",
  "home.duplicateLabel": "Make a copy of this test",
  "home.delete": "Delete test",
  "home.deleteConfirm": "Delete the test “{title}”? This can't be undone.",
  "home.storageNote":
    "Tests are saved only in this browser on this computer and won't appear on other devices.",

  "editor.back": "My tests",
  "editor.saving": "Saving…",
  "editor.saved": "Saved",
  "editor.total": "Total: {points} pts",
  "editor.notFoundTitle": "Test not found",
  "editor.notFoundText": "It may have been deleted, or created in a different browser.",
  "editor.backHome": "Back to my tests",

  "header.heading": "Test details",
  "header.schoolName": "School name",
  "header.optional": "optional",
  "header.schoolNamePlaceholder": "e.g. Tbilisi Public School No. 1",
  "header.title": "Test title",
  "header.titlePlaceholder": "e.g. Unit test — Fractions",
  "header.subject": "Subject",
  "header.grade": "Grade / class",
  "header.gradePlaceholder": "e.g. 7B",
  "header.date": "Date",
  "header.timeLimit": "Time (minutes)",
  "header.timeLimitPlaceholder": "e.g. 45",
  "header.instructions": "Instructions for students",
  "header.instructionsPlaceholder":
    "e.g. Read each question carefully. Show your full working for open questions.",
  "header.labelStyle": "Answer labels",
  "header.labelStyleHint": "How multiple-choice answers are labelled.",

  "questions.heading": "Questions",
  "questions.empty": "No questions yet. Add the first one with the buttons below.",
  "questions.add": "Add a question",
  "questions.number": "Question {number}",
  "questions.type": "Question type",
  "questions.points": "Points",
  "questions.text": "Question text",
  "questions.textPlaceholder": "Type the question or task…",
  "questions.statementPlaceholder": "Type a statement that is either true or false…",
  "questions.drag": "Move (drag, or use Space and the arrow keys)",
  "questions.duplicate": "Duplicate",
  "questions.delete": "Delete question",
  "questions.deleteConfirm": "Delete question {number}?",

  "type.multiple-choice": "Multiple choice",
  "type.true-false": "True / false",
  "type.short-answer": "Short answer",
  "type.open-answer": "Open answer (with working)",

  "mc.optionPlaceholder": "Answer {label}",
  "mc.markCorrect": "Mark {label} as the correct answer",
  "mc.correct": "Correct",
  "mc.hint": "Click a letter to mark the correct answer.",
  "mc.noCorrect": "No correct answer marked yet.",
  "mc.addOption": "Add answer",
  "mc.removeOption": "Remove answer {label}",

  "tf.correctAnswer": "Correct answer:",
  "tf.true": "True",
  "tf.false": "False",

  "sa.answer": "Correct answer",
  "sa.answerHint": "shown only on the answer key",
  "sa.answerPlaceholder": "e.g. x = 4",

  "oa.lines": "Blank lines for working",
  "oa.preview": "How it will look on paper:",
};

export const dictionaries: Record<Language, Record<MessageKey, string>> = { ka, en };
