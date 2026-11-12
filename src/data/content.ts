/**
 * Loads all of DevPath's learning content from src/content/.
 *
 * The content (roadmap, lessons, quizzes, glossary) lives in plain JSON and
 * Markdown files, NOT in the app code. That separation means you can fix a
 * typo or add a whole new topic without touching any React component.
 * Lessons and quizzes are loaded in lessons.ts. The file
 * src/data/content.test.ts checks all of them for mistakes. Run
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

// ---------- Loading the roadmap and glossary ----------
// (Lessons and quizzes are loaded separately, in lessons.ts. See why there.)

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

/** The topics just before and after this one in roadmap order (for "Next →" links). */
export function getNeighbors(topicId: string): { previous?: Topic; next?: Topic } {
  const index = allTopics.findIndex((topic) => topic.id === topicId)
  if (index === -1) return {}
  return { previous: allTopics[index - 1], next: allTopics[index + 1] }
}
