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
    txt("¹", "სქოლიოს ნიშანი 1", "Footnote mark 1", { group: { ka: "სქოლიო:", en: "Footnotes:" } }),
    txt("²", "სქოლიოს ნიშანი 2", "Footnote mark 2"),
    txt("³", "სქოლიოს ნიშანი 3", "Footnote mark 3"),
    txt("*", "ვარსკვლავი (შენიშვნა)", "Asterisk (note)"),
  ],
};

const term = (text: string, ka: string, en: string, extra: Partial<ToolbarButton> = {}) => txt(text, ka, en, extra);

/** Grammar words teachers write again and again in tasks (inserted as plain text). */
const GRAMMAR_TAB: ToolbarTab = {
  id: "grammar",
  ka: "გრამატიკა",
  en: "Grammar",
  buttons: [
    term("სახ.", "სახელობითი ბრუნვა", "Nominative case", { group: { ka: "ბრუნვები:", en: "Cases:" } }),
    term("მოთხ.", "მოთხრობითი ბრუნვა", "Ergative case"),
    term("მიც.", "მიცემითი ბრუნვა", "Dative case"),
    term("ნათ.", "ნათესაობითი ბრუნვა", "Genitive case"),
    term("მოქმ.", "მოქმედებითი ბრუნვა", "Instrumental case"),
    term("ვით.", "ვითარებითი ბრუნვა", "Adverbial case"),
    term("წოდ.", "წოდებითი ბრუნვა", "Vocative case"),
    term("ქვემდებარე", "ქვემდებარე", "Subject", { group: { ka: "წინადადების წევრები:", en: "Parts of a sentence:" } }),
    term("შემასმენელი", "შემასმენელი", "Predicate"),
    term("დამატება", "დამატება", "Object"),
    term("განსაზღვრება", "განსაზღვრება", "Attribute"),
    term("გარემოება", "გარემოება", "Adverbial"),
    term("I პ.", "პირველი პირი", "First person", { group: { ka: "პირი და რიცხვი:", en: "Person & number:" } }),
    term("II პ.", "მეორე პირი", "Second person"),
    term("III პ.", "მესამე პირი", "Third person"),
    term("მხ. რ.", "მხოლობითი რიცხვი", "Singular"),
    term("მრ. რ.", "მრავლობითი რიცხვი", "Plural"),
  ],
};

export const GEORGIAN_TOOLBAR: ToolbarTab[] = [MARKS_TAB, GRAMMAR_TAB];
