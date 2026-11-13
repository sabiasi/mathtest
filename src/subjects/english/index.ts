import { Languages } from "lucide-react";
import type { FillBlankQuestion, Question, TrueFalseQuestion } from "@/lib/storage/types";
import type { SubjectToolkit } from "../types";
import { ENGLISH_TOOLBAR } from "./toolbar";

/** A question text from a template (English), with its Georgian version for bilingual printing. */
const withInstruction = (en: string, ka: string) => (question: Question): Question => ({
  ...question,
  text: [{ type: "text", text: en }],
  instructionKa: ka,
});

/** One-click instructions: English for the paper, Georgian for younger students (bilingual printing). */
export const ENGLISH_INSTRUCTIONS = [
  { id: "choose", en: "Choose the correct answer.", ka: "აირჩიეთ სწორი პასუხი." },
  { id: "circle", en: "Circle the correct word.", ka: "შემოხაზეთ სწორი სიტყვა." },
  { id: "box", en: "Complete the sentences with the words from the box.", ka: "შეავსეთ წინადადებები ჩარჩოში მოცემული სიტყვებით." },
  { id: "read", en: "Read the text and answer the questions.", ka: "წაიკითხეთ ტექსტი და უპასუხეთ კითხვებს." },
  {
    id: "tfng",
    en: "Read the text. Are the sentences True (T), False (F) or Not Given (NG)?",
    ka: "წაიკითხეთ ტექსტი. წინადადებები სწორია (T), მცდარია (F) თუ ტექსტში ეს ნათქვამი არ არის (NG)?",
  },
  { id: "headings", en: "Match the headings to the paragraphs. There is one extra heading.", ka: "შეუსაბამეთ სათაურები აბზაცებს. ერთი სათაური ზედმეტია." },
  { id: "which-paragraph", en: "Which paragraph mentions…? Write the letter of the paragraph.", ka: "რომელ აბზაცშია ნახსენები…? ჩაწერეთ აბზაცის ასო." },
  { id: "gaps", en: "Read the text and fill in the gaps.", ka: "წაიკითხეთ ტექსტი და შეავსეთ გამოტოვებული ადგილები." },
  { id: "verbs", en: "Put the verbs in brackets into the correct form.", ka: "ფრჩხილებში მოცემული ზმნები ჩასვით სწორი ფორმით." },
  {
    id: "transform",
    en: "Complete the second sentence so that it means the same as the first. Use the word given. Do not change it. Use two to five words.",
    ka: "დაასრულეთ მეორე წინადადება ისე, რომ მას პირველის მნიშვნელობა ჰქონდეს. გამოიყენეთ მოცემული სიტყვა, არ შეცვალოთ იგი. გამოიყენეთ 2–5 სიტყვა.",
  },
  {
    id: "word-formation",
    en: "Use the word given in capitals at the end of each line to form a word that fits in the gap.",
    ka: "სტრიქონის ბოლოს დიდი ასოებით მოცემული სიტყვიდან შექმენით სიტყვა, რომელიც გამოტოვებულ ადგილას ჯდება.",
  },
  { id: "mistakes", en: "Find and correct the mistake in each sentence.", ka: "იპოვეთ და გაასწორეთ შეცდომა თითოეულ წინადადებაში." },
  { id: "abcd", en: "Which underlined part (A, B, C or D) is wrong?", ka: "რომელი ხაზგასმული ნაწილია (A, B, C თუ D) არასწორი?" },
  { id: "order", en: "Put the sentences in the correct order.", ka: "დაალაგეთ წინადადებები სწორი თანმიმდევრობით." },
  { id: "dialogue", en: "Put the lines of the dialogue in the correct order.", ka: "დაალაგეთ დიალოგის რეპლიკები სწორი თანმიმდევრობით." },
  { id: "definitions", en: "Match the words to the definitions.", ka: "შეუსაბამეთ სიტყვები განმარტებებს." },
  { id: "pictures", en: "Look at the pictures and write the words.", ka: "დააკვირდით სურათებს და დაწერეთ სიტყვები." },
  { id: "label", en: "Label the picture. Use the words from the box.", ka: "წააწერეთ სურათს სახელები. გამოიყენეთ ჩარჩოში მოცემული სიტყვები." },
  { id: "odd", en: "Find the odd one out.", ka: "იპოვეთ ზედმეტი სიტყვა." },
  { id: "listen", en: "Listen and answer the questions.", ka: "მოუსმინეთ და უპასუხეთ კითხვებს." },
  { id: "crossword", en: "Solve the crossword.", ka: "ამოხსენით კროსვორდი." },
  { id: "word-search", en: "Find the words in the word search.", ka: "იპოვეთ სიტყვები ცხრილში." },
  { id: "email", en: "Write an email to your friend. Write 120–150 words.", ka: "დაწერეთ ელფოსტა მეგობარს. დაწერეთ 120–150 სიტყვა." },
  { id: "essay", en: "Write an essay. Write 180–220 words.", ka: "დაწერეთ ესე. დაწერეთ 180–220 სიტყვა." },
];

const find = (id: string) => ENGLISH_INSTRUCTIONS.find((i) => i.id === id)!;

/**
 * English (as a foreign language), levels A1–C1, exam styles like Cambridge
 * and the national exams. The paper is in English (labels and instructions),
 * optionally with Georgian instructions under them.
 */
export const englishToolkit: SubjectToolkit = {
  id: "english",
  Icon: Languages,
  colors: { icon: "text-subject-english", chip: "bg-subject-english/12" },
  status: "ready",
  formulas: false,
  toolbar: ENGLISH_TOOLBAR,
  questionTypes: [
    "section",
    "passage",
    "listening",
    "multiple-choice",
    "true-false",
    "short-answer",
    "open-answer",
    "matching",
    "fill-blank",
    "transformation",
    "word-formation",
    "find-mistake",
    "order",
    "picture-match",
    "odd-one-out",
    "map",
    "crossword",
    "word-search",
    "essay",
    "speaking",
  ],
  diagrams: [],
  levels: true,
  bilingual: true,
  contentLanguage: "en",
  labelStyle: "latin",
  markersOnPicture: true,
  instructionTemplates: ENGLISH_INSTRUCTIONS,
  typeLabels: {
    passage: { ka: "საკითხავი ტექსტი (Reading)", en: "Reading text", hintKa: "ტექსტი აბზაცების ასოებით ან სტრიქონების ნომრებით", hintEn: "With paragraph letters or line numbers" },
    "fill-blank": { ka: "გამოტოვებული სიტყვები (Gap fill)", en: "Gap fill", hintKa: "ღია, სიტყვების ყუთით ან A/B/C/D", hintEn: "Open, with a word box, or A/B/C/D" },
    "find-mistake": { ka: "შეცდომის გასწორება", en: "Error correction", hintKa: "გაასწორეთ, ან აირჩიეთ ხაზგასმული A–D", hintEn: "Correct it, or choose underlined A–D" },
    order: { ka: "სწორი თანმიმდევრობა", en: "Put in order", hintKa: "წინადადებები, აბზაცები, დიალოგი", hintEn: "Sentences, paragraphs, a dialogue" },
    map: { ka: "სურათზე წარწერები", en: "Label the picture", hintKa: "სურათი დანომრილი ნიშნებით", hintEn: "A picture with numbered markers" },
    essay: { ka: "წერა (Writing)", en: "Writing", hintKa: "ელფოსტა, წერილი, ესე, მოთხრობა", hintEn: "Email, letter, essay, story" },
  },
  presets: [
    {
      id: "verb-forms",
      type: "fill-blank",
      ka: "ზმნის ფორმები",
      en: "Verb forms",
      hintKa: "She ____ (go) to school yesterday.",
      hintEn: "She ____ (go) to school yesterday.",
      apply: (q) => ({ ...withInstruction(find("verbs").en, find("verbs").ka)(q), mode: "open", numbered: true }) as FillBlankQuestion,
    },
    {
      id: "true-false-not-given",
      type: "true-false",
      ka: "True / False / Not Given",
      en: "True / False / Not Given",
      hintKa: "სამი პასუხი წაკითხულის შესამოწმებლად",
      hintEn: "Three answers for reading tasks",
      apply: (q) => ({ ...withInstruction(find("tfng").en, find("tfng").ka)(q), notGiven: true }) as TrueFalseQuestion,
    },
  ],
  matchingTemplates: [
    { id: "word-definition", left: { ka: "Word", en: "Word" }, right: { ka: "Definition", en: "Definition" } },
    { id: "word-synonym", left: { ka: "Word", en: "Word" }, right: { ka: "Synonym", en: "Synonym" } },
    { id: "word-opposite", left: { ka: "Word", en: "Word" }, right: { ka: "Opposite", en: "Opposite" } },
    { id: "word-translation", left: { ka: "English", en: "English" }, right: { ka: "ქართული", en: "Georgian" } },
    { id: "heading-paragraph", left: { ka: "Paragraph", en: "Paragraph" }, right: { ka: "Heading", en: "Heading" } },
    { id: "question-answer", left: { ka: "Question", en: "Question" }, right: { ka: "Answer", en: "Answer" } },
  ],
  print: { className: "subject-english", language: "en" },
};
