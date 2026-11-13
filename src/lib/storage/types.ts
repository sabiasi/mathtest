/**
 * The shapes of MathTest's data.
 *
 * A "type" in TypeScript is a description of what an object looks like.
 * It doesn't exist when the app runs — it only helps the editor and the
 * compiler catch mistakes (like a typo in a field name) before you run anything.
 */

import type { RichText } from "@/lib/richText";
import type { WordRef } from "@/lib/words";
import type { SubjectId } from "@/subjects/ids";

/** How multiple-choice options are labelled: A, B, C… or ა, ბ, გ… */
export type LabelStyle = "latin" | "georgian";

/**
 * A picture or diagram placed in a question. A stored picture lives in the
 * cloud / IndexedDB (see lib/images/imageStore.ts); here we only keep its id
 * and how it is shown. A diagram (circuit, forces…) is kept right here as
 * data and drawn on the fly.
 */
export interface QuestionImage {
  /** This placement's own id (the same picture can appear in two questions). */
  id: string;
  /** The stored picture ("" for a diagram). */
  imageId: string;
  /** Set for diagrams drawn with the subject tools; then there's no stored picture. */
  diagram?: Diagram;
  /** Natural size in pixels — used for the aspect ratio before the picture loads. */
  width: number;
  height: number;
  /** Width as a percentage of the question's width (10–100). */
  widthPercent: number;
  /** Above the question text, or to the right of it. */
  position: "above" | "right";
  /** Printed under the picture, e.g. "სურ. 1. ბაგრატის ტაძარი" ("" = none). */
  caption: string;
}

// ---------------------------------------------------------------------------
// Diagrams drawn with a subject's tools (physics: circuits, forces). They are
// stored as data (not as a picture), so the teacher can open and change them,
// and they are drawn as sharp vector graphics on screen, paper and PDF.
// ---------------------------------------------------------------------------

/** Parts of an electric circuit. */
export type CircuitPart =
  | "wire"
  | "battery"
  | "resistor"
  | "lamp"
  | "switch-open"
  | "switch-closed"
  | "ammeter"
  | "voltmeter";

/**
 * One part, placed on a gap between two neighbouring grid dots.
 * `at` = "h:x:y" (from dot x,y to the dot on its right) or
 *        "v:x:y" (from dot x,y to the dot below it).
 */
export interface CircuitElement {
  at: string;
  part: CircuitPart;
  /** e.g. "R1" (printed as R₁) or "6 Ω". */
  label: string;
  /** Battery: swap the + and − sides. */
  flipped: boolean;
}

export interface CircuitDiagram {
  kind: "circuit";
  /** Grid size in squares (the dots are one more in each direction). */
  cols: number;
  rows: number;
  elements: CircuitElement[];
}

/** One force arrow, starting at the centre of the body. */
export interface ForceArrow {
  id: string;
  /** Direction in degrees: 0 = right, 90 = up, 180 = left, 270 = down. */
  angle: number;
  /** 1 = short, 2 = medium, 3 = long. */
  length: 1 | 2 | 3;
  /** e.g. "mg", "N", "F_ხ" (after "_" is written small, below). */
  label: string;
}

export interface ForceDiagram {
  kind: "forces";
  body: "box" | "ball";
  /** What the body stands on. */
  surface: "none" | "floor" | "incline";
  /** Slope of the incline in degrees (15–60). */
  inclineAngle: number;
  forces: ForceArrow[];
  /** Draw a small arrow over each force's letter (F⃗), as in textbooks. */
  vectorLabels: boolean;
}

/**
 * Chemistry: an expanded structural formula on a grid of dots. Atoms sit on
 * dots ("x:y"), bonds on the gaps between neighbouring dots ("h:x:y" /
 * "v:x:y", like circuits): single, double or triple.
 */
export interface StructureDiagram {
  kind: "structure";
  cols: number;
  rows: number;
  atoms: { at: string; label: string }[];
  bonds: { at: string; order: 1 | 2 | 3 }[];
}

export type Diagram = CircuitDiagram | ForceDiagram | StructureDiagram;
export type DiagramKind = Diagram["kind"];

/** Graph paper or a coordinate plane printed as an answer area. 5 mm squares. */
export interface AnswerGrid {
  kind: "squares" | "coordinates";
  cols: number;
  rows: number;
}

/** Fields every question has, whatever its type. */
interface QuestionBase {
  id: string;
  /** Can be a half point, e.g. 1.5. */
  points: number;
  /** The question: text mixed with formulas. */
  text: RichText;
  images: QuestionImage[];
  /** An optional grid answer area under the question. */
  grid: AnswerGrid | null;
}

export interface ChoiceOption {
  id: string;
  text: RichText;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: "multiple-choice";
  /** 2 to 6 options. */
  options: ChoiceOption[];
  /** The id of the correct option, or null if not marked yet. */
  correctOptionId: string | null;
  /** Keep the options in this order in every variant (e.g. "all of the above" last). */
  lockOptions: boolean;
}

export interface TrueFalseQuestion extends QuestionBase {
  type: "true-false";
  /** true = the statement is true; null = not marked yet. */
  correct: boolean | null;
}

export interface ShortAnswerQuestion extends QuestionBase {
  type: "short-answer";
  /** The expected answer, shown only on the answer key. Optional. */
  answer: RichText;
}

export interface OpenAnswerQuestion extends QuestionBase {
  type: "open-answer";
  /** How many blank lines students get for their work. */
  lines: number;
}

/**
 * A physics problem in the standard Georgian school layout:
 * მოცემულია (Given) | საპოვნელია (Find) on the left, ამოხსნა (Solution) on the right.
 * The teacher's own given/find/solution/answer appear only on the answer key.
 */
export interface GivenFindQuestion extends QuestionBase {
  type: "given-find";
  /** Height of the frame, in writing lines. */
  lines: number;
  given: RichText;
  find: RichText;
  solution: RichText;
  /** The final answer (also shown in the answer table). */
  answer: RichText;
}

/**
 * Matching (every subject): pairs that belong together, e.g. a person and
 * a date. The left column is numbered 1, 2, 3…; the right column is lettered
 * and printed in a shuffled order, plus optional extra (wrong) items.
 * Students write the letters into answer boxes: 1–[ ] 2–[ ] 3–[ ].
 */
export interface MatchingPair {
  id: string;
  left: RichText;
  right: RichText;
}

export interface MatchingQuestion extends QuestionBase {
  type: "matching";
  /** Optional headings over the columns, e.g. "პიროვნება" and "თარიღი". */
  leftTitle: string;
  rightTitle: string;
  pairs: MatchingPair[];
  /** Extra right-column items that match nothing (makes guessing harder). */
  extras: ChoiceOption[];
  /** Printed copies only (lib/variants.ts): the shuffled order of the right column. */
  shownOrder?: string[];
}

/**
 * History: put events in chronological order. `items` are stored in the
 * CORRECT order; the paper shows them shuffled and lettered, with a row of
 * boxes for the letters in the right order.
 */
export interface OrderQuestion extends QuestionBase {
  type: "order";
  items: ChoiceOption[];
  /** Printed copies only (lib/variants.ts): the shuffled order of the items. */
  shownOrder?: string[];
}

/** One point on a timeline. `hide` = what students must fill in. */
export interface TimelineEvent {
  id: string;
  date: RichText;
  label: RichText;
  hide: "none" | "date" | "label";
}

/** History: a timeline with events/dates; some are left blank for students. */
export interface TimelineQuestion extends QuestionBase {
  type: "timeline";
  /** Left to right, evenly spaced. */
  events: TimelineEvent[];
}

/** One question about the source: ა) ბ) გ)… */
export interface SourcePart {
  id: string;
  text: RichText;
  lines: number;
  /** The expected answer, only on the answer key. */
  answer: RichText;
}

/** History: a historical document or quote, its source, and questions about it. */
export interface SourceQuestion extends QuestionBase {
  type: "source";
  source: RichText;
  /** Where it's from, e.g. „ქართლის ცხოვრება“. Printed under the quote. */
  sourceCaption: RichText;
  parts: SourcePart[];
}

/** A numbered marker on a map, in % of the map's width / height. */
export interface MapMarker {
  id: string;
  x: number;
  y: number;
  /** The place, for the answer key (and the word bank). */
  answer: string;
}

/** History: a map picture with numbered markers; students name the places. */
export interface MapQuestion extends QuestionBase {
  type: "map";
  /** The uploaded map (a stored picture), or null until one is added. */
  map: { imageId: string; width: number; height: number } | null;
  /** How wide the map is printed, in % of the question width. */
  mapWidth: number;
  markers: MapMarker[];
  /** Also print the answers as a list to choose from (alphabetical). */
  wordBank: boolean;
}

// ---------------------------------------------------------------------------
// Text blocks: a reading text or a poem. They are NOT questions (no number,
// no points); the questions after them refer to them. On paper they may
// continue on the next page (paragraph by paragraph / stanza by stanza).
// The question `text` is an optional instruction above ("წაიკითხეთ…").
// ---------------------------------------------------------------------------

export interface PassageQuestion extends QuestionBase {
  type: "passage";
  title: string;
  author: string;
  /** The text, one paragraph per line. Pasted by the teacher. */
  body: string;
  /** Number every 5th printed line in the margin (for "lines 12–15" questions). */
  lineNumbers: boolean;
}

export interface PoemQuestion extends QuestionBase {
  type: "poem";
  title: string;
  author: string;
  /** One verse per line; an empty line between stanzas. Kept exactly. */
  body: string;
  lineNumbers: boolean;
}

/** Fill in the blanks (every subject): words of `body` the teacher chose are left blank. */
export interface FillBlankQuestion extends QuestionBase {
  type: "fill-blank";
  body: string;
  /** Which words are blanks, with an optional hint printed after the blank, e.g. "წერა". */
  blanks: (WordRef & { hint: string })[];
  /** Also print the missing words as a list to choose from. */
  wordBank: boolean;
}

/** Georgian: "underline the nouns" — the key shows the marked words underlined. */
export interface MarkWordsQuestion extends QuestionBase {
  type: "mark-words";
  body: string;
  marked: WordRef[];
}

/** Georgian: a table — word | case (ბრუნვა) / screeve (მწკრივი) / part of speech… */
export interface GrammarTableQuestion extends QuestionBase {
  type: "grammar-table";
  wordTitle: string;
  answerTitle: string;
  rows: { id: string; word: string; answer: string }[];
  /** Terms printed above the table to choose from (e.g. the 7 cases); [] = none. */
  bank: string[];
}

/** Georgian: find and correct the mistake in each sentence. */
export interface FindMistakeQuestion extends QuestionBase {
  type: "find-mistake";
  items: { id: string; sentence: string; mistake: WordRef | null; correction: string }[];
}

/** Georgian: sentence analysis — subject (ქვემდებარე), predicate (შემასმენელი)… */
export interface SentenceAnalysisQuestion extends QuestionBase {
  type: "sentence-analysis";
  sentence: string;
  parts: { id: string; role: string; answer: string }[];
}

/** An essay: guiding points, the expected length, and lines (may continue on the next page). */
export interface EssayQuestion extends QuestionBase {
  type: "essay";
  lines: number;
  guide: string[];
  /** e.g. "150–200 სიტყვა" ("" = not shown). */
  length: string;
}

/**
 * Chemistry: balance the equation. The teacher writes the BALANCED equation
 * ("2H2 + O2 -> 2H2O"); the paper shows an empty box before every substance,
 * the answer key the coefficients.
 */
export interface BalanceQuestion extends QuestionBase {
  type: "balance";
  equations: { id: string; balanced: string }[];
}

/**
 * A question is exactly ONE of these. The `type` field tells which one —
 * TypeScript calls this a "discriminated union".
 */
export type Question =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | ShortAnswerQuestion
  | OpenAnswerQuestion
  | GivenFindQuestion
  | MatchingQuestion
  | OrderQuestion
  | TimelineQuestion
  | SourceQuestion
  | MapQuestion
  | PassageQuestion
  | PoemQuestion
  | FillBlankQuestion
  | MarkWordsQuestion
  | GrammarTableQuestion
  | FindMistakeQuestion
  | SentenceAnalysisQuestion
  | EssayQuestion
  | BalanceQuestion;

export type QuestionType = Question["type"];

/** How the test is printed. Saved with the test so it's remembered. */
export interface PrintOptions {
  fontSize: "normal" | "large";
  showPoints: boolean;
  columns: 1 | 2;
}

export const DEFAULT_PRINT_OPTIONS: PrintOptions = { fontSize: "normal", showPoints: true, columns: 1 };

/**
 * Variants A, B, C… of the same test with questions / options in a different
 * order. `seed` makes the shuffle repeatable: the same seed always gives the
 * same variants, so answer keys keep matching papers that were already printed.
 */
export interface VariantSettings {
  /** 1 = no variants. Up to 6 (A–F). */
  count: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  seed: number;
  /** When printing all variants together: start each one on a new sheet of paper. */
  duplex: boolean;
}

export const DEFAULT_VARIANTS: Omit<VariantSettings, "seed"> = {
  count: 1,
  shuffleQuestions: true,
  shuffleOptions: true,
  duplex: false,
};

/** One test / quiz / exam. */
export interface Test {
  id: string;
  schoolName: string;
  title: string;
  /** Which subject toolkit the editor uses (toolbar, question types, print styles). */
  subjectId: SubjectId;
  /** The subject's name as printed on the paper (teachers may write e.g. "ალგებრა"). */
  subject: string;
  grade: string;
  /** Exam date as "YYYY-MM-DD", or "" when not set. */
  date: string;
  /** Time allowed in minutes, or null when not set. */
  timeLimitMinutes: number | null;
  instructions: string;
  labelStyle: LabelStyle;
  questions: Question[];
  printOptions: PrintOptions;
  variants: VariantSettings;
  /** ISO timestamps, e.g. "2026-11-12T15:30:00.000Z". */
  createdAt: string;
  updatedAt: string;
}
