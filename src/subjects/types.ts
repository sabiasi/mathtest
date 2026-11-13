/**
 * What a "subject toolkit" is.
 *
 * The editor, the question cards, saving and printing are shared by every
 * subject. A toolkit only describes what is SPECIAL about one subject:
 * its toolbar, extra question types and print styles. The editor reads
 * the toolkit of the test's subject and shows the right tools.
 */
import type { LucideIcon } from "lucide-react";
import type { QuestionType } from "@/lib/storage/types";
import type { SubjectId } from "./ids";

/**
 * One toolbar button. It inserts a formula (LaTeX). Special MathLive markers:
 *   #?  an empty box the teacher clicks into and fills in
 *   #@  "whatever is selected" (or an empty box if nothing is)
 * `display` is what the button shows; `ka` / `en` the tooltip.
 */
export type ToolbarButton = { latex: string; display: string; ka: string; en: string };
export type ToolbarTab = { id: string; ka: string; en: string; buttons: ToolbarButton[] };

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
  /** Show the "Σ Formula" button and formula toolbar while editing. */
  formulas: boolean;
  /** The toolbar's tabs while a question box is being edited ([] = no toolbar). */
  toolbar: ToolbarTab[];
  /** Question types offered in this subject: the common ones plus any special ones. */
  questionTypes: readonly QuestionType[];
  /** The printed sheets get this class, so ./<id>/print.css can style them. */
  print: { className: string };
}
