/**
 * "Migration": upgrading saved data to the current shape.
 *
 * Tests saved by an older version of MathTest may be missing fields that
 * were added later (e.g. `schoolName`). Instead of crashing, every test we
 * read from storage passes through `normalizeTest`, which fills in safe
 * defaults. Unknown or broken questions are dropped rather than crashing.
 */
import {
  DEFAULT_GIVEN_FIND_LINES,
  DEFAULT_LINES,
  GRID_LIMITS,
  LIMITS,
  MAX_LINES,
  MAX_OPTIONS,
  MIN_GIVEN_FIND_LINES,
} from "@/lib/questions";
import { normalizeDiagram } from "@/subjects/physics/diagrams/normalize";
import { normalizeRichText } from "@/lib/richText";
import { DEFAULT_SUBJECT, isSubjectId, subjectFromText } from "@/subjects/ids";
import {
  type AnswerGrid,
  type QuestionImage,
  DEFAULT_PRINT_OPTIONS,
  DEFAULT_VARIANTS,
  type ChoiceOption,
  type LabelStyle,
  type PrintOptions,
  type Question,
  type Test,
  type VariantSettings,
} from "./types";

type Loose = Record<string, unknown>;

const isObject = (v: unknown): v is Loose => typeof v === "object" && v !== null;
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function normalizeOptions(value: unknown, max = MAX_OPTIONS): ChoiceOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .filter((o) => typeof o.id === "string")
    .slice(0, max)
    .map((o) => ({ id: o.id as string, text: normalizeRichText(o.text) }));
}

/** A clicked word ({ word, occurrence }), or null if it isn't one. */
function wordRef(value: unknown) {
  if (!isObject(value) || typeof value.word !== "string" || !value.word) return null;
  return { word: value.word.slice(0, 100), occurrence: Math.max(0, Math.round(num(value.occurrence, 0))) };
}

/** A list of strings, each at most `length` long. */
const strings = (value: unknown, max: number, length: number) =>
  (Array.isArray(value) ? value : []).filter((v): v is string => typeof v === "string").slice(0, max).map((v) => v.slice(0, length));

/** A list of objects with string ids, at most `max`, each repaired by `fix`. */
function list<T>(value: unknown, max: number, fix: (item: Loose & { id: string }) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .filter((item): item is Loose & { id: string } => typeof item.id === "string")
    .slice(0, max)
    .map(fix);
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function normalizeImages(value: unknown): QuestionImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .filter((i) => typeof i.id === "string" && typeof i.imageId === "string")
    .map((i): QuestionImage | null => {
      const image: QuestionImage = {
        id: i.id as string,
        imageId: i.imageId as string,
        width: Math.max(1, num(i.width, 400)),
        height: Math.max(1, num(i.height, 300)),
        widthPercent: clamp(Math.round(num(i.widthPercent, 50)), 10, 100),
        position: i.position === "right" ? "right" : "above",
        caption: str(i.caption).slice(0, 300),
      };
      if (i.diagram === undefined) return image.imageId ? image : null;
      // A diagram: keep it only if its data makes sense.
      const diagram = normalizeDiagram(i.diagram);
      return diagram ? { ...image, imageId: "", diagram } : null;
    })
    .filter((i): i is QuestionImage => i !== null);
}

function normalizeGrid(value: unknown): AnswerGrid | null {
  if (!isObject(value)) return null;
  return {
    kind: value.kind === "coordinates" ? "coordinates" : "squares",
    cols: clamp(Math.round(num(value.cols, 20)), GRID_LIMITS.minCols, GRID_LIMITS.maxCols),
    rows: clamp(Math.round(num(value.rows, 12)), GRID_LIMITS.minRows, GRID_LIMITS.maxRows),
  };
}

function normalizeQuestion(raw: unknown): Question | null {
  if (!isObject(raw) || typeof raw.id !== "string") return null;
  // Phase 1 saved text as a plain string; normalizeRichText upgrades it.
  const base = {
    id: raw.id,
    text: normalizeRichText(raw.text),
    points: Math.max(0, num(raw.points, 1)),
    images: normalizeImages(raw.images),
    grid: normalizeGrid(raw.grid),
  };

  switch (raw.type) {
    case "multiple-choice": {
      const options = normalizeOptions(raw.options);
      const correct = options.some((o) => o.id === raw.correctOptionId)
        ? (raw.correctOptionId as string)
        : null;
      return { ...base, type: "multiple-choice", options, correctOptionId: correct, lockOptions: raw.lockOptions === true };
    }
    case "true-false":
      return {
        ...base,
        type: "true-false",
        correct: typeof raw.correct === "boolean" ? raw.correct : null,
      };
    case "short-answer":
      return { ...base, type: "short-answer", answer: normalizeRichText(raw.answer) };
    case "open-answer": {
      const lines = Math.min(MAX_LINES, Math.max(0, Math.round(num(raw.lines, DEFAULT_LINES))));
      return { ...base, type: "open-answer", lines };
    }
    case "matching":
      return {
        ...base,
        type: "matching",
        leftTitle: str(raw.leftTitle).slice(0, 100),
        rightTitle: str(raw.rightTitle).slice(0, 100),
        pairs: list(raw.pairs, LIMITS.matchingPairs.max, (p) => ({
          id: p.id,
          left: normalizeRichText(p.left),
          right: normalizeRichText(p.right),
        })),
        extras: normalizeOptions(raw.extras, LIMITS.matchingExtras),
      };
    case "order":
      return { ...base, type: "order", items: normalizeOptions(raw.items, LIMITS.orderItems.max) };
    case "timeline":
      return {
        ...base,
        type: "timeline",
        events: list(raw.events, LIMITS.timelineEvents.max, (e) => ({
          id: e.id,
          date: normalizeRichText(e.date),
          label: normalizeRichText(e.label),
          hide: e.hide === "date" || e.hide === "none" ? e.hide : "label",
        })),
      };
    case "source":
      return {
        ...base,
        type: "source",
        source: normalizeRichText(raw.source),
        sourceCaption: normalizeRichText(raw.sourceCaption),
        parts: list(raw.parts, LIMITS.sourceParts.max, (p) => ({
          id: p.id,
          text: normalizeRichText(p.text),
          lines: clamp(Math.round(num(p.lines, 3)), 0, MAX_LINES),
          answer: normalizeRichText(p.answer),
        })),
      };
    case "map": {
      const map =
        isObject(raw.map) && typeof raw.map.imageId === "string" && raw.map.imageId
          ? { imageId: raw.map.imageId, width: Math.max(1, num(raw.map.width, 800)), height: Math.max(1, num(raw.map.height, 600)) }
          : null;
      return {
        ...base,
        type: "map",
        map,
        mapWidth: clamp(Math.round(num(raw.mapWidth, 80)), LIMITS.mapWidth.min, LIMITS.mapWidth.max),
        markers: list(raw.markers, LIMITS.mapMarkers, (m) => ({
          id: m.id,
          x: clamp(num(m.x, 50), 0, 100),
          y: clamp(num(m.y, 50), 0, 100),
          answer: str(m.answer).slice(0, 100),
        })),
        wordBank: raw.wordBank === true,
      };
    }
    case "passage":
    case "poem":
      return {
        ...base,
        type: raw.type,
        points: 0,
        title: str(raw.title).slice(0, 300),
        author: str(raw.author).slice(0, 300),
        body: str(raw.body).slice(0, LIMITS.passageChars),
        lineNumbers: typeof raw.lineNumbers === "boolean" ? raw.lineNumbers : raw.type === "passage",
      };
    case "fill-blank":
      return {
        ...base,
        type: "fill-blank",
        body: str(raw.body).slice(0, LIMITS.shortTextChars),
        blanks: (Array.isArray(raw.blanks) ? raw.blanks : [])
          .slice(0, LIMITS.blanks)
          .map((b) => {
            const ref = wordRef(b);
            return ref ? { ...ref, hint: str(isObject(b) ? b.hint : "").slice(0, 100) } : null;
          })
          .filter((b) => b !== null),
        wordBank: raw.wordBank === true,
      };
    case "mark-words":
      return {
        ...base,
        type: "mark-words",
        body: str(raw.body).slice(0, LIMITS.shortTextChars),
        marked: (Array.isArray(raw.marked) ? raw.marked : []).slice(0, LIMITS.blanks).map(wordRef).filter((m) => m !== null),
      };
    case "grammar-table":
      return {
        ...base,
        type: "grammar-table",
        wordTitle: str(raw.wordTitle).slice(0, 100),
        answerTitle: str(raw.answerTitle).slice(0, 100),
        rows: list(raw.rows, LIMITS.tableRows, (row) => ({ id: row.id, word: str(row.word).slice(0, 200), answer: str(row.answer).slice(0, 200) })),
        bank: strings(raw.bank, 20, 100),
      };
    case "find-mistake":
      return {
        ...base,
        type: "find-mistake",
        items: list(raw.items, LIMITS.mistakeItems, (item) => ({
          id: item.id,
          sentence: str(item.sentence).slice(0, 500),
          mistake: wordRef(item.mistake),
          correction: str(item.correction).slice(0, 200),
        })),
      };
    case "sentence-analysis":
      return {
        ...base,
        type: "sentence-analysis",
        sentence: str(raw.sentence).slice(0, 500),
        parts: list(raw.parts, LIMITS.sentenceParts, (part) => ({ id: part.id, role: str(part.role).slice(0, 100), answer: str(part.answer).slice(0, 200) })),
      };
    case "essay":
      return {
        ...base,
        type: "essay",
        lines: clamp(Math.round(num(raw.lines, 20)), 0, LIMITS.essayLines),
        guide: strings(raw.guide, LIMITS.guidePoints, 300),
        length: str(raw.length).slice(0, 100),
      };
    case "given-find": {
      const lines = clamp(Math.round(num(raw.lines, DEFAULT_GIVEN_FIND_LINES)), MIN_GIVEN_FIND_LINES, MAX_LINES);
      return {
        ...base,
        type: "given-find",
        lines,
        given: normalizeRichText(raw.given),
        find: normalizeRichText(raw.find),
        solution: normalizeRichText(raw.solution),
        answer: normalizeRichText(raw.answer),
      };
    }
    default:
      return null;
  }
}

function normalizePrintOptions(raw: unknown): PrintOptions {
  const o = isObject(raw) ? raw : {};
  return {
    fontSize: o.fontSize === "large" ? "large" : DEFAULT_PRINT_OPTIONS.fontSize,
    showPoints: typeof o.showPoints === "boolean" ? o.showPoints : DEFAULT_PRINT_OPTIONS.showPoints,
    columns: o.columns === 2 ? 2 : DEFAULT_PRINT_OPTIONS.columns,
  };
}

/** A stable number made from a text (the test id), used as the default shuffle seed. */
export function seedFromString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

function normalizeVariants(raw: unknown, id: string): VariantSettings {
  const o = isObject(raw) ? raw : {};
  const count = typeof o.count === "number" ? Math.round(o.count) : DEFAULT_VARIANTS.count;
  return {
    count: Math.min(6, Math.max(1, count)),
    shuffleQuestions: typeof o.shuffleQuestions === "boolean" ? o.shuffleQuestions : DEFAULT_VARIANTS.shuffleQuestions,
    shuffleOptions: typeof o.shuffleOptions === "boolean" ? o.shuffleOptions : DEFAULT_VARIANTS.shuffleOptions,
    seed: typeof o.seed === "number" && Number.isFinite(o.seed) ? o.seed >>> 0 : seedFromString(id),
    duplex: o.duplex === true,
  };
}

/** Returns a complete, valid Test, or null if `raw` isn't a test at all. */
export function normalizeTest(raw: unknown): Test | null {
  if (!isObject(raw) || typeof raw.id !== "string") return null;
  const now = new Date().toISOString();
  const labelStyle: LabelStyle = raw.labelStyle === "latin" ? "latin" : "georgian";
  const questions = Array.isArray(raw.questions)
    ? raw.questions.map(normalizeQuestion).filter((q): q is Question => q !== null)
    : [];

  return {
    id: raw.id,
    schoolName: str(raw.schoolName),
    title: str(raw.title),
    // Tests from before subjects existed: guess from the printed name, else math.
    subjectId: isSubjectId(raw.subjectId) ? raw.subjectId : (subjectFromText(str(raw.subject)) ?? DEFAULT_SUBJECT),
    subject: str(raw.subject),
    grade: str(raw.grade),
    date: str(raw.date),
    timeLimitMinutes:
      typeof raw.timeLimitMinutes === "number" && raw.timeLimitMinutes > 0
        ? raw.timeLimitMinutes
        : null,
    instructions: str(raw.instructions),
    labelStyle,
    questions,
    printOptions: normalizePrintOptions(raw.printOptions),
    variants: normalizeVariants(raw.variants, raw.id),
    createdAt: str(raw.createdAt, now),
    updatedAt: str(raw.updatedAt, now),
  };
}
