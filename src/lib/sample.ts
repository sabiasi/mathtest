"use client";

/**
 * The sample test ("მაგალითი") that new teachers can open to see what
 * MathTest can do: formulas, every question type, a geometry figure, a
 * coordinate plane, a locked option and variants. It's a normal test, so
 * teachers can change or delete it freely.
 */
import type { Language } from "@/i18n/dictionaries";
import { newId } from "@/lib/ids";
import { addImage } from "@/lib/images/imageStore";
import type { RichText } from "@/lib/richText";
import { createTest } from "@/lib/storage/testsRepository";
import type { ChoiceOption, Question, Test } from "@/lib/storage/types";
import { newSeed } from "@/lib/variants";

const T = (text: string) => ({ type: "text" as const, text });
const M = (latex: string) => ({ type: "math" as const, latex });

/** A right triangle ABC (legs 6 and 8, hypotenuse "?"), drawn as SVG. Labels are Latin only. */
const TRIANGLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="260" viewBox="0 0 360 260">
<polygon points="40,220 320,220 40,30" fill="none" stroke="#000" stroke-width="3" stroke-linejoin="round"/>
<polyline points="40,196 64,196 64,220" fill="none" stroke="#000" stroke-width="2"/>
<g font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#000">
<text x="16" y="246">A</text><text x="324" y="246">B</text><text x="16" y="28">C</text>
<text x="172" y="248">8</text><text x="14" y="132">6</text><text x="192" y="114">?</text>
</g></svg>`;

const TEXTS = {
  ka: {
    title: "მაგალითი — წილადები, განტოლებები და გეომეტრია",
    school: "სანიმუშო საჯარო სკოლა",
    subject: "მათემატიკა",
    grade: "მე-7 კლასი",
    instructions: "ყურადღებით წაიკითხეთ ყოველი დავალება. ღია კითხვებზე ჩაწერეთ სრული ამოხსნა.",
    compute: "გამოთვალეთ: ",
    prime: "რომელი რიცხვია მარტივი?",
    rectangle: "ნებისმიერი მართკუთხედი კვადრატია.",
    solve: "ამოხსენით განტოლება: ",
    triangle: "ნახაზზე მოცემულია მართკუთხა სამკუთხედი ABC. იპოვეთ BC გვერდის სიგრძე.",
    graph: ["კოორდინატთა სიბრტყეზე ააგეთ ", " ფუნქციის გრაფიკი."],
    system: "ამოხსენით განტოლებათა სისტემა: ",
    power: ["რისი ტოლია ", "?"],
    none: "არცერთი ზემოთ ჩამოთვლილი",
  },
  en: {
    title: "Sample — fractions, equations and geometry",
    school: "Sample Public School",
    subject: "Mathematics",
    grade: "Grade 7",
    instructions: "Read each task carefully. For open questions, write out your full working.",
    compute: "Calculate: ",
    prime: "Which number is prime?",
    rectangle: "Every rectangle is a square.",
    solve: "Solve the equation: ",
    triangle: "The figure shows a right triangle ABC. Find the length of side BC.",
    graph: ["On the coordinate plane, draw the graph of ", "."],
    system: "Solve the system of equations: ",
    power: ["What is ", "?"],
    none: "none of the above",
  },
};

function options(texts: RichText[]): ChoiceOption[] {
  return texts.map((text) => ({ id: newId(), text }));
}

function multipleChoice(text: RichText, choices: RichText[], correct: number, points = 1, lockOptions = false): Question {
  const opts = options(choices);
  return { id: newId(), type: "multiple-choice", text, points, images: [], grid: null, options: opts, correctOptionId: opts[correct].id, lockOptions };
}

/** Creates a fresh copy of the sample test and returns it. */
export async function createSampleTest(language: Language): Promise<Test> {
  const x = TEXTS[language];
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  // The figure goes into the picture store first (it may fail in rare
  // private-browsing modes — then the question simply has no picture).
  const figure = await addImage(new Blob([TRIANGLE_SVG], { type: "image/svg+xml" })).catch(() => null);

  const questions: Question[] = [
    multipleChoice([T(x.compute), M("\\frac{1}{2}+\\frac{1}{3}")], [[M("\\frac{5}{6}")], [M("\\frac{2}{5}")], [M("\\frac{1}{6}")], [M("\\frac{2}{6}")]], 0),
    multipleChoice([T(x.prime)], [[T("21")], [T("27")], [T("29")], [T("33")]], 2),
    { id: newId(), type: "true-false", text: [M("\\sqrt{49}=7")], points: 1, images: [], grid: null, correct: true },
    { id: newId(), type: "true-false", text: [T(x.rectangle)], points: 1, images: [], grid: null, correct: false },
    { id: newId(), type: "short-answer", text: [T(x.solve), M("2x+5=17")], points: 2, images: [], grid: null, answer: [M("x=6")] },
    {
      id: newId(),
      type: "short-answer",
      text: [T(x.triangle)],
      points: 2,
      images: figure
        ? [{ id: newId(), imageId: figure.imageId, width: figure.width, height: figure.height, widthPercent: 35, position: "right", caption: "" }]
        : [],
      grid: null,
      answer: [M("BC=10")],
    },
    {
      id: newId(),
      type: "open-answer",
      text: [T(x.graph[0]), M("y=2x-1"), T(x.graph[1])],
      points: 3,
      images: [],
      grid: { kind: "coordinates", cols: 16, rows: 12 },
      lines: 0,
    },
    {
      id: newId(),
      type: "open-answer",
      text: [T(x.system), M("\\begin{cases}x+y=10\\\\x-y=4\\end{cases}")],
      points: 3,
      images: [],
      grid: null,
      lines: 6,
    },
    // "none of the above" must stay last → this question's options are locked.
    multipleChoice([T(x.power[0]), M("2^3"), T(x.power[1])], [[T("6")], [T("8")], [T("9")], [T(x.none)]], 1, 1, true),
  ];

  return createTest({
    title: x.title,
    schoolName: x.school,
    subjectId: "math",
    subject: x.subject,
    grade: x.grade,
    date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
    timeLimitMinutes: 45,
    instructions: x.instructions,
    labelStyle: language === "en" ? "latin" : "georgian",
    questions,
    variants: { count: 2, shuffleQuestions: true, shuffleOptions: true, seed: newSeed(), duplex: false },
  });
}
