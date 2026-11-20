/**
 * The shapes of MathTest's data.
 *
 * A "type" in TypeScript is a description of what an object looks like.
 * It doesn't exist when the app runs — it only helps the editor and the
 * compiler catch mistakes (like a typo in a field name) before you run anything.
 */

import type { BioDrawingId } from "@/subjects/biology/drawingIds";
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

export type GeometryShape =
  | "triangle" | "square" | "rectangle" | "circle" | "parallelogram" | "trapezoid"
  | "rhombus" | "right-trapezoid" | "pentagon" | "hexagon";
export type TrianglePreset = "general" | "right" | "isosceles" | "equilateral" | "obtuse";

/**
 * Mathematics: one geometric figure with optional letters and side labels.
 * The labels are only written next to the figure ("5 სმ", "x", "?"); the
 * figure itself has a fixed, tidy shape and is not drawn to scale.
 */
export interface GeometryDiagram {
  kind: "geometry";
  shape: GeometryShape;
  /** Which triangle (used only when `shape` is "triangle"). */
  triangle: TrianglePreset;
  /** Letters at the corners (circle: the centre). */
  showVertices: boolean;
  /** One letter per corner, in drawing order (circle: one, the centre). */
  vertices: string[];
  /** One label per side; side i joins corner i and the next one. "" = none. */
  sides: string[];
  /** Circle: draw a radius. */
  radius: boolean;
  radiusLabel: string;
  /** Right triangle: the small square in the right angle. */
  rightAngle: boolean;
  /**
   * Extras, each drawn only where the shape allows it (see `geometryExtras`):
   * a circle inside touching every side, a circle through every corner,
   * the diagonals, a height (dashed, with its label), a circle's diameter.
   */
  inscribed: boolean;
  circumscribed: boolean;
  diagonals: boolean;
  height: boolean;
  heightLabel: string;
  diameter: boolean;
  /** The letter at the centre of an inscribed / circumscribed circle ("" = none). */
  centerLetter: string;
}

export type Diagram = CircuitDiagram | ForceDiagram | StructureDiagram | GeometryDiagram;
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
  /** The instruction in Georgian, printed under the (English) question text when "bilingual" is on. */
  instructionKa?: string;
  /** A helper note for the teacher, shown in the editor only — never printed (sample tests use it). */
  tip?: string;
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
  /** Also offer "Not given" (English reading tasks: True / False / Not Given). */
  notGiven?: boolean;
  /** true / false / "not-given" (only with notGiven); null = not marked yet. */
  correct: boolean | "not-given" | null;
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
  /**
   * Ruled lines or blank space of the same height. Not set = the subject's
   * default (toolkit `print.openAnswerSpace`: blank in mathematics, else lines).
   */
  answerSpace?: "lines" | "blank";
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
  /** Letters A, B, C… before the paragraphs ("Which paragraph mentions…"). */
  paragraphLetters?: boolean;
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

/**
 * Fill in the blanks / gap fill (every subject): words of `body` the teacher
 * chose are left blank.
 *   open   — students write the word (a hint like "(go)" may follow the gap)
 *   bank   — the words (plus extra wrong ones) are printed in a box, shuffled
 *   choice — each gap has options A/B/C/D printed under the text
 */
export interface FillBlankQuestion extends QuestionBase {
  type: "fill-blank";
  body: string;
  /** Which words are blanks; `hint` is printed after the gap; `options` are wrong choices (choice mode). */
  blanks: (WordRef & { hint: string; options?: string[] })[];
  mode: "open" | "bank" | "choice";
  /** Number the gaps (1), (2)… */
  numbered: boolean;
  /** Extra wrong words for the word box. */
  extras: string[];
  /** Printed copies only (lib/variants.ts): word box order, and each gap's choices in order. */
  shownBank?: string[];
  shownChoices?: string[][];
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
  /** "correct": find and write the correction; "abcd": 4 underlined parts A–D, one is wrong. */
  style?: "correct" | "abcd";
  /** `parts`: the underlined words (abcd style); the mistake is one of them. */
  items: { id: string; sentence: string; mistake: WordRef | null; correction: string; parts?: WordRef[] }[];
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

// ---------------------------------------------------------------------------
// English (as a foreign language)
// ---------------------------------------------------------------------------

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const SECTION_KINDS = ["reading", "use-of-english", "vocabulary", "listening", "writing", "speaking", "custom"] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

/** A section heading ("Reading", "Writing"…): not a question; its points are the sum of the questions after it. */
export interface SectionQuestion extends QuestionBase {
  type: "section";
  kind: SectionKind;
  /** Used for "custom" (and printed instead of the standard name when filled). */
  title: string;
}

/** Listening: a link to the recording (QR code on paper) and the transcript (answer key only). Not a question. */
export interface ListeningQuestion extends QuestionBase {
  type: "listening";
  /** A public link students can open (YouTube, Google Drive…); "" = none. */
  link: string;
  showQr: boolean;
  /** "You will hear the recording twice." */
  plays: 1 | 2 | 3;
  transcript: string;
}

/** Speaking: cue cards printed on their own pages with cut lines. Not a question. */
export interface SpeakingQuestion extends QuestionBase {
  type: "speaking";
  perPage: 2 | 4;
  /** `prompts`: one per line. */
  cards: { id: string; title: string; prompts: string }[];
}

/** Rewrite the sentence using the KEY WORD: original, KEY WORD, "before ______ after". */
export interface TransformationQuestion extends QuestionBase {
  type: "transformation";
  items: { id: string; original: string; keyWord: string; before: string; after: string; answer: string }[];
}

/** Word formation: each line has a gap and the root word in CAPITALS at its end (HAPPY → happiness). */
export interface WordFormationQuestion extends QuestionBase {
  type: "word-formation";
  /** The full, correct sentence; `gap` = the word students form; `root` = the given word. */
  items: { id: string; sentence: string; gap: WordRef | null; root: string }[];
}

/** Vocabulary: numbered pictures, students write the word (from a box of words). */
export interface PictureMatchQuestion extends QuestionBase {
  type: "picture-match";
  pictures: { id: string; imageId: string; width: number; height: number; answer: string }[];
  /** Extra wrong words for the box. */
  extras: string[];
  /** Print the word box (else students write the words freely). */
  wordBank: boolean;
  /** Printed copies only: the word box order. */
  shownBank?: string[];
}

/** Biology: one label on a diagram. Positions are in % of the drawing area (the picture plus room at the sides). */
export interface DiagramLabel {
  id: string;
  /** Where the line points to. */
  x: number;
  y: number;
  /** Where the label (an empty box or a number) sits. */
  lx: number;
  ly: number;
  /** The name: shown on the answer key (and in the word box). */
  answer: string;
}

/**
 * Biology: "label the diagram". A built-in drawing (subjects/biology/drawings.ts)
 * or an uploaded picture, with numbered pointer lines.
 * - boxes:   empty boxes on the paper; students write the names in them
 * - numbers: numbers on the paper and numbered lines below
 * - match:   numbers on the paper and a lettered word box; students write the letters
 */
export interface LabelDiagramQuestion extends QuestionBase {
  type: "label-diagram";
  picture: { kind: "builtin"; drawing: BioDrawingId } | { kind: "upload"; imageId: string; width: number; height: number } | null;
  /** How wide the drawing area is printed, in % of the question width. */
  pictureWidth: number;
  labels: DiagramLabel[];
  mode: "boxes" | "numbers" | "match";
  /** boxes / numbers: also print the names to choose from (alphabetical). */
  wordBank: boolean;
  /** Extra wrong names for the word box. */
  extras: string[];
  /** Printed copies only (lib/variants.ts): the word box order in "match" mode. */
  shownBank?: string[];
}

/**
 * Biology: a Punnett square. The parents are typed like "Aa", "AaBb" or
 * "XᴬXᵃ" (lib/genetics.ts builds the grid). `shown` = the cells students
 * get filled in ("row:col"); all the others are empty boxes to complete.
 */
export interface PunnettQuestion extends QuestionBase {
  type: "punnett";
  mother: string;
  father: string;
  shown: string[];
  /** Students also write the gametes (the row and column headings are empty). */
  blankGametes: boolean;
  /** Print "Parents: ♀ Aa × ♂ Aa" above the square. */
  showParents: boolean;
  /** Ask for the genotype and phenotype ratios (lines below; the key fills them in). */
  askRatios: boolean;
  /** Names for the forms of each trait, by gene letter ("a": yellow / green). */
  traits: Record<string, { dominant: string; recessive: string }>;
}

/** One person in a pedigree chart. `slot` = place in the generation's row (0 = leftmost). */
export interface PedigreePerson {
  id: string;
  sex: "male" | "female" | "unknown";
  status: "unaffected" | "affected" | "carrier";
  /** 0 = generation I. */
  gen: number;
  slot: number;
  deceased: boolean;
  /** Printed under the symbol (e.g. a genotype "Aa"). */
  text: string;
  /** Students write this person's genotype in a box under the symbol. */
  ask: boolean;
  /** For the answer key. */
  answer: string;
}

export interface PedigreeCouple {
  id: string;
  a: string;
  b: string;
  children: string[];
}

/** Biology: a family tree with the standard symbols (□ ○, filled = affected, half-filled = carrier). */
export interface PedigreeQuestion extends QuestionBase {
  type: "pedigree";
  people: PedigreePerson[];
  couples: PedigreeCouple[];
  /** Print the symbols' meaning under the chart. */
  legend: boolean;
  /** Print "1, 2, 3…" under each person (with I, II, III on the left: "II-3"). */
  numbers: boolean;
}

/**
 * Biology: a DNA / RNA strand and rows to complete (lib/molecular.ts works
 * out the answers): the complementary strand, the mRNA, the amino acids.
 */
export interface SequenceQuestion extends QuestionBase {
  type: "sequence";
  /** As typed, e.g. "TAC GGA CTT". */
  given: string;
  tasks: ("complement" | "mrna" | "protein")[];
  /** Which DNA strand is given: the template (mRNA = complement) or the coding strand (mRNA = same with U). */
  strand: "template" | "coding";
  /** Students get the first codon of every row filled in, as an example. */
  example: boolean;
}

/** Biology: the genetic code table (mRNA codons → amino acids). Not a question: no number, no points. */
export interface CodonTableQuestion extends QuestionBase {
  type: "codon-table";
  /** Also print the amino acids' full names. */
  legend: boolean;
}

/** One organism in a food chain / web, on a grid (row 0 = top). */
export interface FoodWebOrganism {
  id: string;
  name: string;
  col: number;
  row: number;
  /** An empty box on the student's paper. */
  hidden: boolean;
}

/** Biology: a food chain or web. Arrows point from the food to the eater (the way energy flows). */
export interface FoodWebQuestion extends QuestionBase {
  type: "food-web";
  organisms: FoodWebOrganism[];
  arrows: { id: string; from: string; to: string }[];
  /** Print "→ energy flow" under it. */
  legend: boolean;
}

/** One level of an ecological pyramid (the list starts at the bottom: producers). */
export interface PyramidLevel {
  id: string;
  /** The trophic level, printed on the left (e.g. "პროდუცენტები"). */
  level: string;
  name: string;
  value: string;
  /** What students fill in. */
  hide: "none" | "name" | "value" | "both";
}

/** Biology: an ecological pyramid (energy, biomass or numbers). */
export interface PyramidQuestion extends QuestionBase {
  type: "pyramid";
  levels: PyramidLevel[];
}

/** One answer of a dichotomous key's question: go on to another question, or an organism. */
export interface KeyLead {
  /** The id of the next question, or null when this answer names an organism. */
  next: string | null;
  organism: string;
  /** Students write the organism. */
  hide: boolean;
}

export interface KeyCouplet {
  id: string;
  question: string;
  yes: KeyLead;
  no: KeyLead;
}

/** Biology: a dichotomous (identification) key, printed as numbered steps or as a tree. */
export interface DichotomousKeyQuestion extends QuestionBase {
  type: "dichotomous-key";
  /** The first one is where the key starts. */
  couplets: KeyCouplet[];
  style: "list" | "tree";
}

export const TAXONOMY_RANKS = ["domain", "kingdom", "phylum", "class", "order", "family", "genus", "species"] as const;
export type TaxonomyRank = (typeof TAXONOMY_RANKS)[number];

/** Biology: an organism's classification, domain → species, some ranks left for students. */
export interface TaxonomyQuestion extends QuestionBase {
  type: "taxonomy";
  organism: string;
  /** Plants say "განყოფილება" (division) instead of "ტიპი" (phylum). */
  plants: boolean;
  ranks: { rank: TaxonomyRank; value: string; hide: boolean }[];
}

/** Odd one out: rows of words; students circle the one that doesn't belong. */
export interface OddOneOutQuestion extends QuestionBase {
  type: "odd-one-out";
  rows: { id: string; words: string[]; odd: number | null }[];
}

/** A crossword made automatically from words and clues. `seed` decides the layout ("new layout" changes it). */
export interface CrosswordQuestion extends QuestionBase {
  type: "crossword";
  entries: { id: string; word: string; clue: string }[];
  seed: number;
}

/** A word search made automatically from a word list. */
export interface WordSearchQuestion extends QuestionBase {
  type: "word-search";
  words: string[];
  /** Grid size (cells per side). */
  size: number;
  /** Also diagonal and backwards (harder). */
  allDirections: boolean;
  seed: number;
}

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

/**
 * One distance to convert. `ask: "real"` → `value` is centimetres on the
 * map and students find the real distance; `ask: "map"` → `value` is the
 * real distance (in the question's `realUnit`) and students find the map cm.
 */
export interface ScaleRow {
  id: string;
  value: number;
  ask: "real" | "map";
}

/** Geography: map scale — distances on the map ↔ on the ground (answers are calculated). */
export interface ScaleCalcQuestion extends QuestionBase {
  type: "scale-calc";
  /** 1 : denominator, e.g. 50 000. */
  denominator: number;
  /** How the scale is printed: "1 : 50 000", "1 სმ-ში 500 მ" or a scale bar. */
  shown: "numeric" | "named" | "linear";
  /** Students also write the scale in another form (numeric → named, named / bar → numeric). */
  askConvert: boolean;
  /** The unit of real distances. */
  realUnit: "km" | "m";
  rows: ScaleRow[];
}

export const CLIMATE_TASKS = ["warmest", "coldest", "range", "mean", "total", "wettest", "driest"] as const;
export type ClimateTask = (typeof CLIMATE_TASKS)[number];

/** Geography: a climate chart (temperature line + precipitation bars) with questions answered from it. */
export interface ClimateChartQuestion extends QuestionBase {
  type: "climate-chart";
  /** Printed above the chart, e.g. "თბილისი (490 მ)". */
  place: string;
  /** 12 monthly values, January first. */
  temperature: number[];
  precipitation: number[];
  /** Also print the numbers in a table under the chart. */
  table: boolean;
  /** Questions printed under the chart; the key answers are calculated. */
  tasks: ClimateTask[];
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
  | BalanceQuestion
  | SectionQuestion
  | ListeningQuestion
  | SpeakingQuestion
  | TransformationQuestion
  | WordFormationQuestion
  | PictureMatchQuestion
  | OddOneOutQuestion
  | CrosswordQuestion
  | WordSearchQuestion
  | LabelDiagramQuestion
  | PunnettQuestion
  | PedigreeQuestion
  | SequenceQuestion
  | CodonTableQuestion
  | FoodWebQuestion
  | PyramidQuestion
  | DichotomousKeyQuestion
  | TaxonomyQuestion
  | ScaleCalcQuestion
  | ClimateChartQuestion;

export type QuestionType = Question["type"];

/** How the test is printed. Saved with the test so it's remembered. */
export interface PrintOptions {
  fontSize: "normal" | "large";
  showPoints: boolean;
  columns: 1 | 2;
  /** English tests: print the Georgian instructions too (under the English ones). */
  bilingual: boolean;
}

export const DEFAULT_PRINT_OPTIONS: PrintOptions = { fontSize: "normal", showPoints: true, columns: 1, bilingual: false };

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
  /** CEFR level (English tests): "A1"… "C1", or "" when not set. */
  level: CefrLevel | "";
  /** Exam date as "YYYY-MM-DD", or "" when not set. */
  date: string;
  /** Time allowed in minutes, or null when not set. */
  timeLimitMinutes: number | null;
  instructions: string;
  labelStyle: LabelStyle;
  questions: Question[];
  printOptions: PrintOptions;
  variants: VariantSettings;
  /** A folder inside the subject on the "My tests" page ("" = not in a folder). */
  folder: string;
  /** ISO timestamps, e.g. "2026-11-12T15:30:00.000Z". */
  createdAt: string;
  updatedAt: string;
}
