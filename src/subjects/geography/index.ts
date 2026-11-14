import { Earth } from "lucide-react";
import { QUESTION_TYPES } from "@/lib/questions";
import type { SubjectToolkit } from "../types";
import { MATH_SHORTCUTS } from "../math/toolbar";
import { GEOGRAPHY_SEARCH_EXTRA, GEOGRAPHY_TOOLBAR } from "./toolbar";

/** One-click instructions (the paper is Georgian; `en` for English-language tests). */
export const GEOGRAPHY_INSTRUCTIONS = [
  { id: "map", ka: "დაასახელეთ რუკაზე ციფრებით აღნიშნული ობიექტები.", en: "Name the places marked with numbers on the map." },
  { id: "map-bank", ka: "დაასახელეთ რუკაზე აღნიშნული ობიექტები. გამოიყენეთ ჩარჩოში მოცემული სიტყვები.", en: "Name the places on the map. Use the words from the box." },
  { id: "scale", ka: "რუკის მასშტაბის გამოყენებით გამოთვალეთ მანძილები.", en: "Use the map scale to work out the distances." },
  { id: "climate", ka: "დააკვირდით კლიმატის დიაგრამას და უპასუხეთ კითხვებს.", en: "Look at the climate chart and answer the questions." },
  { id: "coordinates", ka: "განსაზღვრეთ ობიექტის გეოგრაფიული კოორდინატები.", en: "Find the geographical coordinates of the place." },
  { id: "match", ka: "შეუსაბამეთ ცნებები მათ განმარტებებს.", en: "Match the terms to their meanings." },
  { id: "choose", ka: "აირჩიეთ სწორი პასუხი.", en: "Choose the correct answer." },
  { id: "explain", ka: "ახსენით თქვენი პასუხი.", en: "Explain your answer." },
];

/**
 * Geography: maps with numbered markers (the history map question, with a
 * built-in outline map of Georgia), map scale calculations, climate charts;
 * a toolbar for coordinates (41°43′ ჩ. გ.) and units.
 */
export const geographyToolkit: SubjectToolkit = {
  id: "geography",
  Icon: Earth,
  colors: { icon: "text-subject-geography", chip: "bg-subject-geography/12" },
  status: "ready",
  formulas: true,
  toolbar: GEOGRAPHY_TOOLBAR,
  searchExtra: GEOGRAPHY_SEARCH_EXTRA,
  typingShortcuts: MATH_SHORTCUTS,
  questionTypes: [...QUESTION_TYPES, "map", "scale-calc", "climate-chart"],
  diagrams: [],
  instructionTemplates: GEOGRAPHY_INSTRUCTIONS,
  matchingTemplates: [
    { id: "term-meaning", left: { ka: "ცნება", en: "Term" }, right: { ka: "განმარტება", en: "Meaning" } },
    { id: "place-country", left: { ka: "ობიექტი", en: "Place" }, right: { ka: "ქვეყანა / რეგიონი", en: "Country / region" } },
    { id: "river-sea", left: { ka: "მდინარე", en: "River" }, right: { ka: "რომელ ზღვას / ტბას ერთვის", en: "Flows into" } },
  ],
  print: { className: "subject-geography", typography: "georgian" },
};
