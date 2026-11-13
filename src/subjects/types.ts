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
import type { DiagramKind, QuestionType } from "@/lib/storage/types";
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
};

/** A small tool shown at the start of a tab (e.g. century → Roman numeral). */
export type ToolbarWidgetProps = { insertText: (text: string, caretBack?: number) => void };
export type ToolbarTab = {
  id: string;
  ka: string;
  en: string;
  buttons: ToolbarButton[];
  /**
   * Optional: the same tab in different writing styles (e.g. units in Latin
   * "m/s" or Georgian "მ/წმ"). A small switch appears in the tab; the choice
   * is remembered in this browser under `storageKey`. The first is the default.
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
  /** The toolbar's tabs while a question box is being edited ([] and no formulas = no toolbar). */
  toolbar: ToolbarTab[];
  /** Question types offered in this subject: the common ones plus any special ones. */
  questionTypes: readonly QuestionType[];
  /** Diagrams teachers can draw in a question ("circuit", "forces"); [] = none. */
  diagrams: readonly DiagramKind[];
  /** Ready-made column headings for matching questions (e.g. Person ↔ Date). */
  matchingTemplates?: { id: string; left: { ka: string; en: string }; right: { ka: string; en: string } }[];
  /**
   * The printed sheets get `className`, so ./<id>/print.css can style them.
   * `typography: "georgian"` prints „quotes“ and long dashes (lib/typography.ts).
   */
  print: { className: string; typography?: "georgian" };
}
