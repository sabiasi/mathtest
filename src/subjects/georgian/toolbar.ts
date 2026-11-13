/**
 * The Georgian Language & Literature toolbar: correct Georgian punctuation
 * and references to line numbers of a reading text. Text buttons only.
 */
import type { ToolbarButton, ToolbarTab } from "../types";

const txt = (text: string, ka: string, en: string, extra: Partial<ToolbarButton> = {}): ToolbarButton => ({
  latex: "",
  display: text,
  text,
  ka,
  en,
  ...extra,
});

const REFERENCES = { ka: "მითითებები:", en: "References:" };

const MARKS_TAB: ToolbarTab = {
  id: "marks",
  ka: "ნიშნები და მითითებები",
  en: "Punctuation and references",
  buttons: [
    { ...txt("„“", "ქართული ბრჭყალები „…“", "Georgian quotation marks „…“"), caretBack: 1 },
    txt("—", "გრძელი ტირე: დიალოგი, ჩანართი", "Long dash: dialogue, aside"),
    txt("–", "მოკლე ტირე: შუალედი (1–5)", "Short dash: range (1–5)"),
    txt("…", "მრავალწერტილი", "Ellipsis"),
    txt("[…]", "ციტატიდან გამოტოვებული ნაწილი", "Part left out of a quote"),
    txt("«»", "კუთხოვანი ბრჭყალები (ციტატა ციტატაში)", "Angle quotes (a quote inside a quote)", { caretBack: 1 }),
    { ...txt("(სტრ. )", "მითითება სტრიქონებზე: (სტრ. 5–8)", "Line reference: (lines 5–8)", { caretBack: 1 }), group: REFERENCES },
    txt("სტრ.", "სტრიქონი", "Line"),
    txt("სტროფი", "სტროფი", "Stanza"),
    txt("აბზაცი", "აბზაცი", "Paragraph"),
  ],
};

export const GEORGIAN_TOOLBAR: ToolbarTab[] = [MARKS_TAB];
