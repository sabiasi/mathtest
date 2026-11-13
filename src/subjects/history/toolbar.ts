/**
 * The History toolkit's toolbar: dates and centuries. These buttons insert
 * plain TEXT (not formulas). Two writing styles: Georgian (ძვ. წ., ს.) and
 * English (BC, c.); the choice is remembered in the browser.
 */
import type { ToolbarButton, ToolbarTab } from "../types";
import { CenturyTool } from "./CenturyTool";

/** A text button: shows and inserts `text`. */
const txt = (text: string, ka: string, en: string, extra: Partial<ToolbarButton> = {}): ToolbarButton => ({
  latex: "",
  display: text,
  text,
  ka,
  en,
  ...extra,
});

const MARKS_GROUP = { ka: "ნიშნები:", en: "Marks:" };
const MARKS: ToolbarButton[] = [
  txt("–", "შუალედი: 1801–1804", "Range: 1801–1804", { group: MARKS_GROUP }),
  { ...txt("„“", "ციტატის ბრჭყალები „…“", "Georgian quotation marks „…“"), caretBack: 1 },
  txt("…", "გამოტოვებული ტექსტი", "Text left out"),
  txt("[…]", "ციტატიდან გამოტოვებული ნაწილი", "Part left out of a quote"),
];

const GEORGIAN: ToolbarButton[] = [
  txt("ძვ. წ.", "ძველი წელთაღრიცხვით (ქრისტეშობამდე)", "Old era (BC)"),
  txt("ახ. წ.", "ახალი წელთაღრიცხვით (ქრისტეშობიდან)", "New era (AD)"),
  txt("ჩვ. წ. აღ.-მდე", "ჩვენს წელთაღრიცხვამდე", "Before our era (BCE)"),
  txt("ჩვ. წ. აღ.", "ჩვენი წელთაღრიცხვით", "Our era (CE)"),
  txt("წ.", "წელი: 1121 წ.", "Year: 1121"),
  txt("ს.", "საუკუნე, შემოკლებით: XII ს.", "Century, short: XII c."),
  txt("საუკუნე", "საუკუნე", "Century"),
  txt("ათასწლეული", "ათასწლეული", "Millennium"),
  txt("I ნახევარი", "საუკუნის პირველი ნახევარი", "First half of the century"),
  txt("II ნახევარი", "საუკუნის მეორე ნახევარი", "Second half of the century"),
  txt("დაახლ.", "დაახლოებით", "About (circa)"),
  ...MARKS,
];

const ENGLISH: ToolbarButton[] = [
  txt("BC", "ქრისტეშობამდე (BC)", "Before Christ"),
  txt("AD", "ქრისტეშობიდან (AD)", "Anno Domini"),
  txt("BCE", "ჩვენს წელთაღრიცხვამდე (BCE)", "Before the Common Era"),
  txt("CE", "ჩვენი წელთაღრიცხვით (CE)", "Common Era"),
  txt("c.", "დაახლოებით (circa)", "About (circa)"),
  txt("century", "საუკუნე", "Century"),
  txt("millennium", "ათასწლეული", "Millennium"),
  txt("1st half", "პირველი ნახევარი", "First half"),
  txt("2nd half", "მეორე ნახევარი", "Second half"),
  ...MARKS,
];

const DATES_TAB: ToolbarTab = {
  id: "dates",
  ka: "თარიღები და საუკუნეები",
  en: "Dates and centuries",
  buttons: GEORGIAN,
  Widget: CenturyTool,
  styles: {
    storageKey: "mathtest:date-style",
    options: [
      { id: "georgian", ka: "ქართული", en: "Georgian", buttons: GEORGIAN },
      { id: "english", ka: "English", en: "English", buttons: ENGLISH },
    ],
  },
};

export const HISTORY_TOOLBAR: ToolbarTab[] = [DATES_TAB];
