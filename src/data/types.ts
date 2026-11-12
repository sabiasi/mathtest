/**
 * The SHAPES of the data DevPath saves about you.
 *
 * In TypeScript an `interface` describes what fields an object has and what
 * type each field is. It doesn't store anything itself; it's a contract that
 * the compiler checks for us, so a typo like `progres.status` is caught before
 * the app even runs.
 *
 * New shapes (journal entries, project milestones…) get added here in later
 * phases, when a feature actually needs them.
 */

/** Where you are with one roadmap topic. */
export type TopicStatus = 'not-started' | 'learning' | 'done'

export interface TopicProgress {
  topicId: string
  status: TopicStatus
  /** When it last changed, as an ISO date string like "2026-11-12T14:30:00.000Z". */
  updatedAt: string
}

/** One try at a topic's "check yourself" quiz. */
export interface QuizAttempt {
  id: string
  topicId: string
  /** How many answers were right. */
  score: number
  /** How many questions there were. */
  total: number
  takenAt: string
}

/**
 * Everything saved, in one object. This is also exactly what the
 * "Export backup" file contains.
 */
export interface SavedData {
  /**
   * Which version of this shape the data is in. When we change the shape in a
   * future version, this number tells the app how to upgrade old saved data
   * (a "migration") instead of crashing on it.
   */
  schemaVersion: number
  /** Keyed by topic id, so looking up one topic is instant. */
  progress: Record<string, TopicProgress>
  quizAttempts: QuizAttempt[]
}
