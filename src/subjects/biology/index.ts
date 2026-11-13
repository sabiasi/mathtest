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
  { id: "punnett-ratios", ka: "შეავსეთ პენეტის მესერი და დაწერეთ გენოტიპებისა და ფენოტიპების თანაფარდობა.", en: "Complete the Punnett square and write the genotype and phenotype ratios." },
  {
    id: "probability",
    ka: "რა არის ალბათობა (%), რომ ამ წყვილის შვილს ნიშანი გამოუვლინდება?",
    en: "What is the probability (%) that a child of this couple shows the trait?",
  },
  {
    id: "pedigree",
    ka: "გაანალიზეთ საგვარეულო ხე: დაადგინეთ, დომინანტურია თუ რეცესიული ნიშანი, და ჩაწერეთ აღნიშნული ადამიანების გენოტიპები.",
    en: "Study the pedigree: decide whether the trait is dominant or recessive, and write the genotypes of the marked people.",
  },
  { id: "order", ka: "დაალაგეთ სტადიები სწორი თანმიმდევრობით.", en: "Arrange the stages in the correct order." },
  { id: "complement", ka: "დაწერეთ დნმ-ის კომპლემენტარული ჯაჭვი.", en: "Write the complementary DNA strand." },
  { id: "transcribe", ka: "დაწერეთ ი-რნმ-ის თანმიმდევრობა (ტრანსკრიფცია).", en: "Write the mRNA sequence (transcription)." },
  {
    id: "translate",
    ka: "გენეტიკური კოდის ცხრილის გამოყენებით განსაზღვრეთ ამინომჟავების თანმიმდევრობა.",
    en: "Use the genetic code table to work out the sequence of amino acids.",
  },
  { id: "food-web", ka: "შეავსეთ კვებითი ქსელი. ისარი ენერგიის გადაცემის მიმართულებას აჩვენებს.", en: "Complete the food web. The arrows show the direction of energy flow." },
  { id: "pyramid", ka: "შეავსეთ ეკოლოგიური პირამიდა.", en: "Complete the ecological pyramid." },
  { id: "key", ka: "სარკვევის გამოყენებით დაასახელეთ ორგანიზმები.", en: "Use the key to identify the organisms." },
  { id: "taxonomy", ka: "შეავსეთ ორგანიზმის სისტემატიკური რანგები.", en: "Complete the organism's classification." },
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
 * (photosynthesis, respiration); genetics: Punnett squares and pedigree
 * charts, with a genotype tool (XAXa → Xᴬ Xᵃ); DNA / RNA sequences and the
 * codon table; food webs and pyramids; dichotomous keys and taxonomy.
 */
export const biologyToolkit: SubjectToolkit = {
  id: "biology",
  Icon: Dna,
  colors: { icon: "text-subject-biology", chip: "bg-subject-biology/12" },
  status: "ready",
  formulas: true,
  chemistry: true,
  toolbar: BIOLOGY_TOOLBAR,
  questionTypes: [
    ...QUESTION_TYPES,
    "label-diagram",
    "punnett",
    "pedigree",
    "sequence",
    "codon-table",
    "food-web",
    "pyramid",
    "dichotomous-key",
    "taxonomy",
    "order",
  ],
  diagrams: [],
  instructionTemplates: BIOLOGY_INSTRUCTIONS,
  typeLabels: {
    order: { ka: "სტადიების თანმიმდევრობა", en: "Put the stages in order", hintKa: "მიტოზი, მონელება, სისხლის მიმოქცევა…", hintEn: "Mitosis, digestion, circulation…" },
  },
  print: { className: "subject-biology", typography: "georgian" },
};
