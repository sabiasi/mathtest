/**
 * What a "subject toolkit" is.
 *
 * The editor, the question cards, saving and printing are shared by every
 * subject. A toolkit only describes what is SPECIAL about one subject:
 * its toolbar, extra question types and print styles. The editor reads
 * the toolkit of the test's subject and shows the right tools.
 */
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import type { TextMark } from "@/lib/richText";
import type { Language } from "@/i18n/dictionaries";
import type { DiagramKind, LabelStyle, Question, QuestionType } from "@/lib/storage/types";
import type { SubjectId } from "./ids";

/**
 * One toolbar button. It inserts a formula (LaTeX). Special MathLive markers:
 *   #?  an empty box the teacher clicks into and fills in
 *   #@  "whatever is selected" (or an empty box if nothing is)
 * `display` is what the button shows; `ka` / `en` the tooltip.
 */
export type ToolbarButton = {
  latex: string;
  display: string;
  ka: string;
  en: string;
  /** Optional small heading shown before this button, starting a group (e.g. "Prefixes:"). */
  group?: { ka: string; en: string };
  /**
   * Insert this plain TEXT instead of a formula (history: "ძვ. წ.").
   * Then `display` is the button's text and `latex` is unused ("").
   */
  text?: string;
  /** After inserting `text`, move the cursor this many characters back (e.g. inside „“). */
  caretBack?: number;
  /** Turn this formatting on/off for the selected text (the button shows `display` as text). */
  format?: TextMark;
  /**
   * Chemistry: type this into the chemistry formula (mhchem, e.g. "->",
   * "(aq)", "^2+") instead of a math formula. `display` is LaTeX for the button.
   */
  chem?: string;
  /**
   * Run a MathLive command in the formula being edited instead of inserting
   * something (matrices: "addRowAfter", "addColumnAfter", "removeRow"…).
   * The button shows `label` (words) instead of a formula.
   */
  command?: string;
  label?: { ka: string; en: string };
  /** Extra words the symbol search should find it by (both languages, e.g. "sqrt root ფესვი"). */
  keywords?: string;
};

/** A stable name for a button (search results, React keys, `data-key` in the DOM). */
export function buttonKey(button: ToolbarButton): string {
  if (button.format) return `f:${button.format}`;
  if (button.command) return `c:${button.command}`;
  if (button.chem !== undefined) return `h:${button.chem}`;
  if (button.text !== undefined) return `t:${button.text}`;
  return `m:${button.latex}`;
}

/** One line of the "typing shortcuts" help: what to type → what appears. */
export type TypingShortcut = { keys: string; display: string; ka: string; en: string };

/** A small tool shown at the start of a tab (e.g. century → Roman numeral). */
export type ToolbarWidgetProps = {
  /** `marks`: e.g. ["italic"] for a Latin name (the text after it is plain again). */
  insertText: (text: string, caretBack?: number, marks?: TextMark[]) => void;
  /** Inserts a formula (LaTeX). */
  insertMath: (latex: string) => void;
  insertChem: (text: string, caretBack?: number) => void;
  /** The tab's writing style in use (e.g. "georgian" / "latin"), when the tab has `styles`. */
  style?: string;
};
export type ToolbarTab = {
  id: string;
  ka: string;
  en: string;
  buttons: ToolbarButton[];
  /**
   * Optional: the same tab in different writing styles (e.g. units in Latin
   * "m/s" or Georgian "მ/წმ"). A small switch appears in the tab; the choice
   * is remembered in this browser under `storageKey`. Give the Georgian option
   * the id "georgian": with the Georgian interface it is shown first and is the
   * default (features/editor/toolbarStyles.ts); otherwise the others come first.
   */
  styles?: {
    storageKey: string;
    options: { id: string; ka: string; en: string; buttons: ToolbarButton[] }[];
  };
  /** Optional tool shown before the buttons. */
  Widget?: ComponentType<ToolbarWidgetProps>;
};

export interface SubjectToolkit {
  id: SubjectId;
  /** The subject's picture (names are in i18n/dictionaries.ts: "subject.<id>"). */
  Icon: LucideIcon;
  /**
   * Colour classes for the icon chip. Written out in full (not built from
   * pieces) so Tailwind can find them in this file.
   */
  colors: { icon: string; chip: string };
  /** "placeholder" = the subject's own tools aren't built yet (the editor says so). */
  status: "ready" | "placeholder";
  /** Show the "Σ Formula" button on the toolbar. */
  formulas: boolean;
  /** Show the "Chemical formula" button (chemistry chips typed like "H2SO4"). */
  chemistry?: boolean;
  /** The toolbar's tabs while a question box is being edited ([] and no formulas = no toolbar). */
  toolbar: ToolbarTab[];
  /** "You can simply type sqrt, pi, a/b…": shown by the toolbar's "typing shortcuts" button (subjects with formulas). */
  typingShortcuts?: TypingShortcut[];
  /** Tabs that aren't shown but whose symbols the search still finds (e.g. the math tabs a subject left out). */
  searchExtra?: ToolbarTab[];
  /** Question types offered in this subject: the common ones plus any special ones. */
  questionTypes: readonly QuestionType[];
  /** Diagrams teachers can draw in a question ("circuit", "forces"); [] = none. */
  diagrams: readonly DiagramKind[];
  /** Show the CEFR level (A1–C1) in the test header and on the paper. */
  levels?: boolean;
  /** Offer Georgian versions of the instructions (printed under the English ones when "bilingual" is on). */
  bilingual?: boolean;
  /** The language the content is written in (for the browser's spellcheck), e.g. "en". */
  contentLanguage?: string;
  /** Answer letters for new tests (English: A, B, C, D). */
  labelStyle?: LabelStyle;
  /** Picture questions with numbered markers are about a picture, not a map (changes the editor's wording). */
  markersOnPicture?: boolean;
  /** One-click instructions (English + Georgian) for the question text. */
  instructionTemplates?: { id: string; en: string; ka: string }[];
  /** Subject-specific names for question types in the "add a question" buttons. */
  typeLabels?: Partial<Record<QuestionType, { ka: string; en: string; hintKa: string; hintEn: string }>>;
  /** Extra "add" buttons that create a ready-set-up question of an existing type. */
  presets?: { id: string; type: QuestionType; ka: string; en: string; hintKa: string; hintEn: string; apply: (question: Question) => Question }[];
  /**
   * Short "how to use it" videos per question type: the name of the recording in
   * public/tutorials/ (`<name>.ka.webm` + `<name>.en.webm`, made by `npm run tutorials`).
   * A question card of such a type shows a "▶ How to use it?" button.
   */
  tutorials?: Partial<Record<QuestionType, string>>;
  /**
   * The subject's guide video: every question type of the toolkit in one video,
   * with chapters (`<name>.<ka|en>.webm` + `.json` in public/tutorials/). Shown
   * from the editor's top bar and the "add a question" panel.
   */
  guideVideo?: string;
  /**
   * The guide video also comes up as a small card in the editor's corner, once per visit
   * (GuideVideoCard; needs `<guideVideo>.<lang>.jpg` next to the video).
   */
  guideCard?: boolean;
  /** Ready-made column headings for matching questions (e.g. Person ↔ Date). */
  matchingTemplates?: { id: string; left: { ka: string; en: string }; right: { ka: string; en: string } }[];
  /**
   * The printed sheets get `className`, so ./<id>/print.css can style them.
   * `typography: "georgian"` prints „quotes“ and long dashes (lib/typography.ts).
   * `openAnswerSpace: "blank"`: open-answer questions START with empty space (the height
   * of their lines) instead of ruled lines (mathematics); each question can switch it.
   */
  print: { className: string; typography?: "georgian"; language?: Language; openAnswerSpace?: "lines" | "blank" };
}
