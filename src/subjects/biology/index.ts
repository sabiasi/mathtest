import { Dna } from "lucide-react";
import { QUESTION_TYPES } from "@/lib/questions";
import type { SubjectToolkit } from "../types";
import { BIOLOGY_TOOLBAR } from "./toolbar";

/** One-click instructions. The paper is Georgian, so `ka` goes into the question (`en` for English-language tests). */
export const BIOLOGY_INSTRUCTIONS = [
  { id: "label", ka: "წააწერეთ დიაგრამას ნაწილების სახელები.", en: "Label the parts of the diagram." },
  { id: "label-bank", ka: "წააწერეთ დიაგრამას ნაწილების სახელები. გამოიყენეთ ჩარჩოში მოცემული სიტყვები.", en: "Label the diagram. Use the words from the box." },
  {
    id: "label-match",
    ka: "შეუსაბამეთ ნომრები ჩარჩოში მოცემულ სახელებს: თითოეული ნომრის გვერდით ჩაწერეთ შესაბამისი ასო.",
    en: "Match the numbers to the names in the box. Write the correct letter next to each number.",
  },
  { id: "punnett", ka: "შეავსეთ პენეტის მესერი.", en: "Complete the Punnett square." },
  { id: "order", ka: "დაალაგეთ სტადიები სწორი თანმიმდევრობით.", en: "Arrange the stages in the correct order." },
  { id: "choose", ka: "აირჩიეთ სწორი პასუხი.", en: "Choose the correct answer." },
  { id: "table", ka: "შეავსეთ ცხრილი.", en: "Complete the table." },
  { id: "graph", ka: "დააკვირდით გრაფიკს და უპასუხეთ კითხვებს.", en: "Look at the graph and answer the questions." },
  { id: "magnification", ka: "გამოთვალეთ გადიდება. აჩვენეთ ამოხსნა.", en: "Calculate the magnification. Show your working." },
  { id: "latin", ka: "დაწერეთ ორგანიზმის ლათინური სახელი.", en: "Write the Latin name of the organism." },
  { id: "explain", ka: "ახსენით თქვენი პასუხი.", en: "Explain your answer." },
  {
    id: "experiment",
    ka: "დაგეგმეთ ექსპერიმენტი: ჩამოაყალიბეთ ჰიპოთეზა, დაასახელეთ დამოუკიდებელი, დამოკიდებული და მუდმივი ცვლადები.",
    en: "Plan an experiment: write a hypothesis and name the independent, dependent and controlled variables.",
  },
];

/**
 * Biology: "label the diagram" with built-in drawings (cell, flower, heart…)
 * or the teacher's own pictures; stages in order; a toolbar with ♂ ♀, units,
 * magnification, Latin names in italics and chemical formulas
 * (photosynthesis, respiration). Genetics, ecology and more come next.
 */
export const biologyToolkit: SubjectToolkit = {
  id: "biology",
  Icon: Dna,
  colors: { icon: "text-subject-biology", chip: "bg-subject-biology/12" },
  status: "ready",
  formulas: true,
  chemistry: true,
  toolbar: BIOLOGY_TOOLBAR,
  questionTypes: [...QUESTION_TYPES, "label-diagram", "order"],
  diagrams: [],
  instructionTemplates: BIOLOGY_INSTRUCTIONS,
  typeLabels: {
    order: { ka: "სტადიების თანმიმდევრობა", en: "Put the stages in order", hintKa: "მიტოზი, მონელება, სისხლის მიმოქცევა…", hintEn: "Mitosis, digestion, circulation…" },
  },
  print: { className: "subject-biology", typography: "georgian" },
};
