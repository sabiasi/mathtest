/**
 * THE TEMPLATE LIBRARY — the list (no questions here).
 *
 * This file is small and safe for the browser: titles, subject, grade.
 * The questions themselves live in content.ts, which only the SERVER reads:
 * /api/templates/<id> hands a template over after checking the plan
 * (Free: the first `templates` of this list — 5; Premium / School: all).
 * That number is `limits.templates` in lib/plans/plans.ts.
 *
 * The order matters: the first five are the free ones, chosen to cover
 * different subjects. Add new templates at the END.
 */
import type { SubjectId } from "@/subjects/ids";

export type TemplateInfo = {
  id: string;
  subject: SubjectId;
  /** As printed in the test header, e.g. "VII კლასი". */
  grade: string;
  /** For the grade filter: 5–12. */
  gradeNumber: number;
  title: string;
  /** One line about what it covers. */
  about: string;
  questions: number;
};

export const TEMPLATES: readonly TemplateInfo[] = [
  { id: "math-7-linear", subject: "math", grade: "VII კლასი", gradeNumber: 7, title: "წრფივი განტოლებები", about: "ერთუცნობიანი წრფივი განტოლებების ამოხსნა და ტექსტური ამოცანა.", questions: 6 },
  { id: "georgian-6-speech", subject: "georgian", grade: "VI კლასი", gradeNumber: 6, title: "მეტყველების ნაწილები", about: "არსებითი სახელი, ზედსართავი, ზმნა — ამოცნობა და გამოყენება.", questions: 6 },
  { id: "english-a2-past", subject: "english", grade: "Grade 7", gradeNumber: 7, title: "Past Simple", about: "Regular and irregular verbs, questions and negatives (A2).", questions: 6 },
  { id: "history-9-ancient", subject: "history", grade: "IX კლასი", gradeNumber: 9, title: "ძველი ცივილიზაციები", about: "ეგვიპტე, შუამდინარეთი, საბერძნეთი და რომი — ძირითადი ცნებები.", questions: 6 },
  { id: "physics-8-motion", subject: "physics", grade: "VIII კლასი", gradeNumber: 8, title: "თანაბარი მოძრაობა", about: "სიჩქარე, მანძილი და დრო; ერთეულების გადაყვანა და ამოცანები.", questions: 6 },
  { id: "math-9-quadratic", subject: "math", grade: "IX კლასი", gradeNumber: 9, title: "კვადრატული განტოლებები", about: "დისკრიმინანტი, ფესვები, ვიეტის თეორემა.", questions: 6 },
  { id: "physics-9-electric", subject: "physics", grade: "IX კლასი", gradeNumber: 9, title: "ელექტრული დენი. ომის კანონი", about: "დენის ძალა, ძაბვა, წინაღობა; მიმდევრობითი და პარალელური შეერთება.", questions: 6 },
  { id: "chemistry-8-substances", subject: "chemistry", grade: "VIII კლასი", gradeNumber: 8, title: "ნივთიერებები და ქიმიური ფორმულები", about: "მარტივი და რთული ნივთიერებები, ფარდობითი მოლეკულური მასა.", questions: 6 },
  { id: "chemistry-9-reactions", subject: "chemistry", grade: "IX კლასი", gradeNumber: 9, title: "ქიმიური რეაქციები", about: "რეაქციის ტიპები და ტოლობების გათანაბრება.", questions: 6 },
  { id: "biology-8-cell", subject: "biology", grade: "VIII კლასი", gradeNumber: 8, title: "უჯრედის აგებულება", about: "ორგანოიდები და მათი ფუნქციები; მცენარეული და ცხოველური უჯრედი.", questions: 6 },
  { id: "biology-9-genetics", subject: "biology", grade: "IX კლასი", gradeNumber: 9, title: "მემკვიდრეობის საფუძვლები", about: "გენი, ალელი, გენოტიპი და ფენოტიპი; მონოჰიბრიდული შეჯვარება.", questions: 6 },
  { id: "geography-7-earth", subject: "geography", grade: "VII კლასი", gradeNumber: 7, title: "დედამიწა და რუკა", about: "გრადუსთა ბადე, მასშტაბი, კონტინენტები და ოკეანეები.", questions: 6 },
  { id: "geography-9-georgia", subject: "geography", grade: "IX კლასი", gradeNumber: 9, title: "საქართველოს ბუნება", about: "რელიეფი, მდინარეები, კლიმატი.", questions: 6 },
  { id: "history-10-georgia", subject: "history", grade: "X კლასი", gradeNumber: 10, title: "საქართველო XI–XIII საუკუნეებში", about: "გაერთიანებული სამეფო: დავით აღმაშენებელი და თამარი.", questions: 6 },
  { id: "georgian-9-syntax", subject: "georgian", grade: "IX კლასი", gradeNumber: 9, title: "მარტივი წინადადება", about: "წინადადების წევრები და პუნქტუაცია.", questions: 6 },
  { id: "english-b1-conditionals", subject: "english", grade: "Grade 9", gradeNumber: 9, title: "Conditionals", about: "Zero, first and second conditional (B1).", questions: 6 },
];

export const templateInfo = (id: string): TemplateInfo | undefined => TEMPLATES.find((template) => template.id === id);

/** May a plan with this `templates` limit use this template? ("all", or among the first N.) */
export function templateAllowed(id: string, limit: number | "all"): boolean {
  const index = TEMPLATES.findIndex((template) => template.id === id);
  return index !== -1 && (limit === "all" || index < limit);
}

export const TEMPLATE_PREFIX = "template-";
