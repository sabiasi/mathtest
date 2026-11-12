/**
 * Loads all of DevPath's learning content from src/content/.
 *
 * The content (roadmap, lessons, quizzes, glossary) lives in plain JSON and
 * Markdown files, NOT in the app code. That separation means you can fix a
 * typo or add a whole new topic without touching any React component.
 * The file src/data/content.test.ts checks the files for mistakes. Run
 * `npm test` after editing content.
 */
import glossaryJson from '../content/glossary.json'
import roadmapJson from '../content/roadmap.json'

// ---------- The shapes of the content ----------

export type ResourceKind = 'docs' | 'course' | 'video' | 'interactive' | 'book' | 'article'

export interface Resource {
  title: string
  url: string
  kind: ResourceKind
}

export interface Topic {
  id: string
  title: string
  /** One short line, shown on the map and in lists. */
  summary: string
  /** Why this topic matters for becoming a developer. */
  why: string
  /** A rough guess at study time, in hours. */
  hours: number
  /** Ids of topics that are good to learn first. Drawn as arrows on the map. */
  prerequisites: string[]
  resources: Resource[]
  /** true = a short starter lesson you can expand yourself. */
  starter?: boolean
}

export interface Stage {
  id: string
  title: string
  summary: string
  topics: Topic[]
}

export interface QuizQuestion {
  question: string
  /** Optional code shown under the question. */
  code?: string
  options: string[]
  /** Index of the correct option: 0 = first, 1 = second, … */
  answer: number
  /** Shown after answering, right or wrong. Teaching is the point! */
  explanation: string
}

export interface Quiz {
  questions: QuizQuestion[]
}

export interface GlossaryEntry {
  term: string
  definition: string
}

// ---------- Loading the files ----------

/*
  import.meta.glob is a Vite feature: it finds every file matching a pattern
  at build time. So adding lessons/my-topic.md is enough for the app to see it,
  with no import line to write.
    query '?raw'  → give us the file's text, not a module
    eager: true   → load them all right away (they're small)
*/
const lessonFiles = import.meta.glob<string>('../content/lessons/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const quizFiles = import.meta.glob<Quiz>('../content/quizzes/*.json', {
  import: 'default',
  eager: true,
})

/** "../content/lessons/variables.md" → "variables" */
function fileId(path: string): string {
  return path.split('/').pop()!.replace(/\.(md|json)$/, '')
}

function byFileId<T>(files: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(files).map(([path, value]) => [fileId(path), value]))
}

const lessonsById = byFileId(lessonFiles)
const quizzesById = byFileId(quizFiles)

// `as` tells TypeScript "trust me, the JSON has this shape". The content test
// double-checks that promise so a typo in the JSON can't sneak through.
export const stages = (roadmapJson as { stages: Stage[] }).stages
export const glossary = glossaryJson as Record<string, GlossaryEntry>

/** Every topic in roadmap order, as one flat list. */
export const allTopics: Topic[] = stages.flatMap((stage) => stage.topics)

const topicsById = new Map(allTopics.map((topic) => [topic.id, topic]))
const stageByTopicId = new Map(
  stages.flatMap((stage) => stage.topics.map((topic) => [topic.id, stage] as const)),
)

// ---------- Small helpers the pages use ----------

export function getTopic(id: string): Topic | undefined {
  return topicsById.get(id)
}

export function getStageOf(topicId: string): Stage | undefined {
  return stageByTopicId.get(topicId)
}

export function getLesson(topicId: string): string | undefined {
  return lessonsById[topicId]
}

export function getQuiz(topicId: string): Quiz | undefined {
  return quizzesById[topicId]
}

/** The topics just before and after this one in roadmap order (for "Next →" links). */
export function getNeighbors(topicId: string): { previous?: Topic; next?: Topic } {
  const index = allTopics.findIndex((topic) => topic.id === topicId)
  if (index === -1) return {}
  return { previous: allTopics[index - 1], next: allTopics[index + 1] }
}

/** Exposed for the content test, which checks every file is used. */
export const contentFileIds = {
  lessons: Object.keys(lessonsById),
  quizzes: Object.keys(quizzesById),
}
