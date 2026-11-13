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
import { isBioDrawingId } from "@/subjects/biology/drawingIds";
import { LABEL_LIMITS } from "@/lib/labelDiagram";
import { PEDIGREE_LIMITS } from "@/lib/pedigree";
import { KEY_LIMITS } from "@/lib/dichotomous";
import { WEB_LIMITS } from "@/lib/ecology";
import { MAX_BASES } from "@/lib/molecular";
import { normalizeRichText } from "@/lib/richText";
import { DEFAULT_SUBJECT, isSubjectId, subjectFromText } from "@/subjects/ids";
import {
  CEFR_LEVELS,
  SECTION_KINDS,
  type CefrLevel,
  type SectionKind,
  type AnswerGrid,
  type QuestionImage,
  DEFAULT_PRINT_OPTIONS,
  DEFAULT_VARIANTS,
  type ChoiceOption,
  type LabelStyle,
  type LabelDiagramQuestion,
  type PedigreePerson,
  type KeyLead,
  type PyramidLevel,
  TAXONOMY_RANKS,
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
    ...(typeof raw.instructionKa === "string" && raw.instructionKa.trim() ? { instructionKa: raw.instructionKa.slice(0, 500) } : {}),
  };

  switch (raw.type) {
    case "multiple-choice": {
      const options = normalizeOptions(raw.options);
      const correct = options.some((o) => o.id === raw.correctOptionId)
        ? (raw.correctOptionId as string)
        : null;
      return { ...base, type: "multiple-choice", options, correctOptionId: correct, lockOptions: raw.lockOptions === true };
    }
    case "true-false": {
      const notGiven = raw.notGiven === true;
      return {
        ...base,
        type: "true-false",
        notGiven,
        correct: typeof raw.correct === "boolean" ? raw.correct : notGiven && raw.correct === "not-given" ? "not-given" : null,
      };
    }
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
        ...(raw.type === "passage" ? { paragraphLetters: raw.paragraphLetters === true } : {}),
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
            if (!ref || !isObject(b)) return null;
            return { ...ref, hint: str(b.hint).slice(0, 100), options: strings(b.options, 3, 100) };
          })
          .filter((b) => b !== null),
        // Older tests had wordBank: true / false.
        mode: raw.mode === "bank" || raw.mode === "choice" || raw.mode === "open" ? raw.mode : raw.wordBank === true ? "bank" : "open",
        numbered: raw.numbered === true,
        extras: strings(raw.extras, 10, 100),
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
        style: raw.style === "abcd" ? "abcd" : "correct",
        items: list(raw.items, LIMITS.mistakeItems, (item) => ({
          id: item.id,
          sentence: str(item.sentence).slice(0, 500),
          mistake: wordRef(item.mistake),
          correction: str(item.correction).slice(0, 200),
          parts: (Array.isArray(item.parts) ? item.parts : []).slice(0, 4).map(wordRef).filter((p) => p !== null),
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
    case "balance":
      return {
        ...base,
        type: "balance",
        equations: list(raw.equations, LIMITS.equations, (e) => ({ id: e.id, balanced: str(e.balanced).slice(0, 300) })),
      };
    case "section":
      return {
        ...base,
        type: "section",
        points: 0,
        kind: SECTION_KINDS.includes(raw.kind as SectionKind) ? (raw.kind as SectionKind) : "custom",
        title: str(raw.title).slice(0, 200),
      };
    case "listening":
      return {
        ...base,
        type: "listening",
        points: 0,
        link: /^https?:\/\//i.test(str(raw.link)) ? str(raw.link).slice(0, 1000) : "",
        showQr: raw.showQr !== false,
        plays: raw.plays === 1 || raw.plays === 3 ? raw.plays : 2,
        transcript: str(raw.transcript).slice(0, LIMITS.passageChars),
      };
    case "speaking":
      return {
        ...base,
        type: "speaking",
        points: 0,
        perPage: raw.perPage === 2 ? 2 : 4,
        cards: list(raw.cards, LIMITS.cards, (c) => ({ id: c.id, title: str(c.title).slice(0, 200), prompts: str(c.prompts).slice(0, 2000) })),
      };
    case "transformation":
      return {
        ...base,
        type: "transformation",
        items: list(raw.items, LIMITS.items, (i) => ({
          id: i.id,
          original: str(i.original).slice(0, 500),
          keyWord: str(i.keyWord).slice(0, 50),
          before: str(i.before).slice(0, 300),
          after: str(i.after).slice(0, 300),
          answer: str(i.answer).slice(0, 300),
        })),
      };
    case "word-formation":
      return {
        ...base,
        type: "word-formation",
        items: list(raw.items, LIMITS.items, (i) => ({ id: i.id, sentence: str(i.sentence).slice(0, 500), gap: wordRef(i.gap), root: str(i.root).slice(0, 50) })),
      };
    case "picture-match":
      return {
        ...base,
        type: "picture-match",
        pictures: list(raw.pictures, LIMITS.pictures, (p) => ({
          id: p.id,
          imageId: str(p.imageId),
          width: Math.max(1, num(p.width, 400)),
          height: Math.max(1, num(p.height, 300)),
          answer: str(p.answer).slice(0, 100),
        })).filter((p) => p.imageId),
        extras: strings(raw.extras, 10, 100),
        wordBank: raw.wordBank !== false,
      };
    case "odd-one-out":
      return {
        ...base,
        type: "odd-one-out",
        rows: list(raw.rows, LIMITS.items, (row) => {
          const words = strings(row.words, 6, 100);
          const odd = typeof row.odd === "number" && row.odd >= 0 && row.odd < words.length ? Math.round(row.odd) : null;
          return { id: row.id, words, odd };
        }),
      };
    case "crossword":
      return {
        ...base,
        type: "crossword",
        entries: list(raw.entries, LIMITS.puzzleWords, (e) => ({ id: e.id, word: str(e.word).slice(0, 30), clue: str(e.clue).slice(0, 300) })),
        seed: Math.round(num(raw.seed, 1)) >>> 0,
      };
    case "word-search":
      return {
        ...base,
        type: "word-search",
        words: strings(raw.words, LIMITS.puzzleWords, 30),
        size: clamp(Math.round(num(raw.size, 10)), LIMITS.wordSearchSize.min, LIMITS.wordSearchSize.max),
        allDirections: raw.allDirections === true,
        seed: Math.round(num(raw.seed, 1)) >>> 0,
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
    case "label-diagram": {
      const p = raw.picture;
      let picture: LabelDiagramQuestion["picture"] = null;
      if (isObject(p) && p.kind === "builtin" && isBioDrawingId(p.drawing)) picture = { kind: "builtin", drawing: p.drawing };
      else if (isObject(p) && p.kind === "upload" && typeof p.imageId === "string" && p.imageId) {
        picture = { kind: "upload", imageId: p.imageId, width: Math.max(1, num(p.width, 800)), height: Math.max(1, num(p.height, 600)) };
      }
      const position = (value: unknown, fallback: number) => clamp(num(value, fallback), 0, 100);
      return {
        ...base,
        type: "label-diagram",
        picture,
        pictureWidth: clamp(Math.round(num(raw.pictureWidth, 100)), LABEL_LIMITS.width.min, LABEL_LIMITS.width.max),
        labels: list(raw.labels, LABEL_LIMITS.labels, (l) => ({
          id: l.id,
          x: position(l.x, 50),
          y: position(l.y, 50),
          lx: position(l.lx, 10),
          ly: position(l.ly, 50),
          answer: str(l.answer).slice(0, 100),
        })),
        mode: raw.mode === "numbers" || raw.mode === "match" ? raw.mode : "boxes",
        wordBank: raw.wordBank === true,
        extras: strings(raw.extras, 10, 100),
      };
    }
    case "punnett": {
      const traits: Record<string, { dominant: string; recessive: string }> = {};
      if (isObject(raw.traits)) {
        for (const [gene, names] of Object.entries(raw.traits).slice(0, 6)) {
          if (/^[a-z]$/.test(gene) && isObject(names)) traits[gene] = { dominant: str(names.dominant).slice(0, 40), recessive: str(names.recessive).slice(0, 40) };
        }
      }
      return {
        ...base,
        type: "punnett",
        mother: str(raw.mother, "Aa").slice(0, 20),
        father: str(raw.father, "Aa").slice(0, 20),
        shown: strings(raw.shown, 64, 5).filter((key) => /^\d:\d$/.test(key)),
        blankGametes: raw.blankGametes === true,
        showParents: raw.showParents !== false,
        askRatios: raw.askRatios !== false,
        traits,
      };
    }
    case "pedigree": {
      const people = list(raw.people, PEDIGREE_LIMITS.people, (x): PedigreePerson => ({
        id: x.id,
        sex: x.sex === "male" ? "male" : x.sex === "female" ? "female" : "unknown",
        status: x.status === "affected" ? "affected" : x.status === "carrier" ? "carrier" : "unaffected",
        gen: clamp(Math.round(num(x.gen, 0)), 0, PEDIGREE_LIMITS.generations - 1),
        slot: clamp(Math.round(num(x.slot, 0)), 0, PEDIGREE_LIMITS.slots - 1),
        deceased: x.deceased === true,
        text: str(x.text).slice(0, 20),
        ask: x.ask === true,
        answer: str(x.answer).slice(0, 20),
      }));
      const ids = new Set(people.map((x) => x.id));
      const couples = list(raw.couples, PEDIGREE_LIMITS.people, (c) => ({
        id: c.id,
        a: str(c.a),
        b: str(c.b),
        children: strings(c.children, PEDIGREE_LIMITS.slots, 64).filter((child) => ids.has(child)),
      })).filter((c) => ids.has(c.a) && ids.has(c.b) && c.a !== c.b);
      return { ...base, type: "pedigree", people, couples, legend: raw.legend !== false, numbers: raw.numbers !== false };
    }
    case "sequence": {
      const tasks = (["complement", "mrna", "protein"] as const).filter((task) => Array.isArray(raw.tasks) && raw.tasks.includes(task));
      return {
        ...base,
        type: "sequence",
        given: str(raw.given).slice(0, MAX_BASES * 2),
        tasks,
        strand: raw.strand === "coding" ? "coding" : "template",
        example: raw.example === true,
      };
    }
    case "codon-table":
      return { ...base, type: "codon-table", points: 0, legend: raw.legend !== false };
    case "food-web": {
      const organisms = list(raw.organisms, WEB_LIMITS.organisms, (o) => ({
        id: o.id,
        name: str(o.name).slice(0, 40),
        col: clamp(Math.round(num(o.col, 0)), 0, WEB_LIMITS.cols - 1),
        row: clamp(Math.round(num(o.row, 0)), 0, WEB_LIMITS.rows - 1),
        hidden: o.hidden === true,
      }));
      const ids = new Set(organisms.map((o) => o.id));
      const arrows = list(raw.arrows, WEB_LIMITS.arrows, (a) => ({ id: a.id, from: str(a.from), to: str(a.to) })).filter(
        (a) => ids.has(a.from) && ids.has(a.to) && a.from !== a.to,
      );
      return { ...base, type: "food-web", organisms, arrows, legend: raw.legend !== false };
    }
    case "pyramid":
      return {
        ...base,
        type: "pyramid",
        levels: list(raw.levels, WEB_LIMITS.levels, (l): PyramidLevel => ({
          id: l.id,
          level: str(l.level).slice(0, 40),
          name: str(l.name).slice(0, 40),
          value: str(l.value).slice(0, 30),
          hide: l.hide === "name" || l.hide === "value" || l.hide === "both" ? l.hide : "none",
        })),
      };
    case "dichotomous-key": {
      const lead = (value: unknown): KeyLead =>
        isObject(value)
          ? { next: typeof value.next === "string" && value.next ? value.next : null, organism: str(value.organism).slice(0, 40), hide: value.hide === true }
          : { next: null, organism: "", hide: false };
      const couplets = list(raw.couplets, KEY_LIMITS.couplets, (c) => ({ id: c.id, question: str(c.question).slice(0, 120), yes: lead(c.yes), no: lead(c.no) }));
      // An answer pointing at a question that no longer exists becomes an (empty) organism.
      const ids = new Set(couplets.map((c) => c.id));
      const fix = (l: KeyLead): KeyLead => (l.next && !ids.has(l.next) ? { ...l, next: null } : l);
      return {
        ...base,
        type: "dichotomous-key",
        couplets: couplets.map((c) => ({ ...c, yes: fix(c.yes), no: fix(c.no) })),
        style: raw.style === "tree" ? "tree" : "list",
      };
    }
    case "taxonomy": {
      const saved = Array.isArray(raw.ranks) ? raw.ranks.filter(isObject) : [];
      return {
        ...base,
        type: "taxonomy",
        organism: str(raw.organism).slice(0, 60),
        plants: raw.plants === true,
        // Always all eight ranks, in order.
        ranks: TAXONOMY_RANKS.map((rank) => {
          const found = saved.find((r) => r.rank === rank);
          return { rank, value: str(found?.value).slice(0, 60), hide: found?.hide === true };
        }),
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
    bilingual: o.bilingual === true,
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
    level: CEFR_LEVELS.includes(raw.level as CefrLevel) ? (raw.level as CefrLevel) : "",
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
