/**
 * Georgian grammar terms used by the grammar questions. These are standard
 * school-grammar terms (not texts), offered as templates and suggestions.
 */

/** Templates for the grammar table: heading + the terms to choose from. */
export const GRAMMAR_TEMPLATES = [
  {
    id: "case",
    wordTitle: "სიტყვა",
    answerTitle: "ბრუნვა",
    terms: ["სახელობითი", "მოთხრობითი", "მიცემითი", "ნათესაობითი", "მოქმედებითი", "ვითარებითი", "წოდებითი"],
  },
  {
    id: "screeve",
    wordTitle: "ზმნა",
    answerTitle: "მწკრივი",
    terms: [
      "აწმყო",
      "უწყვეტელი",
      "აწმყოს კავშირებითი",
      "მყოფადი",
      "ხოლმეობითი",
      "მყოფადის კავშირებითი",
      "წყვეტილი",
      "II კავშირებითი",
      "I თურმეობითი",
      "II თურმეობითი",
      "III კავშირებითი",
    ],
  },
  {
    id: "part-of-speech",
    wordTitle: "სიტყვა",
    answerTitle: "მეტყველების ნაწილი",
    terms: ["არსებითი სახელი", "ზედსართავი სახელი", "რიცხვითი სახელი", "ნაცვალსახელი", "ზმნა", "ზმნიზედა", "თანდებული", "კავშირი", "ნაწილაკი", "შორისდებული"],
  },
  {
    id: "person-number",
    wordTitle: "ზმნა",
    answerTitle: "პირი და რიცხვი",
    terms: ["I პირი, მხოლობითი", "II პირი, მხოლობითი", "III პირი, მხოლობითი", "I პირი, მრავლობითი", "II პირი, მრავლობითი", "III პირი, მრავლობითი"],
  },
] as const;

/** Parts of a sentence (წინადადების წევრები), suggested in sentence analysis. The first 3 are the "standard" rows. */
export const SENTENCE_ROLES = ["ქვემდებარე", "შემასმენელი", "პირდაპირი დამატება", "ირიბი დამატება", "უბრალო დამატება", "განსაზღვრება", "გარემოება"];
