import type { QuizAttempt, TopicProgress, TopicStatus } from './types'

/**
 * The list of things the app can ask the data layer to do.
 *
 * This is the "repository pattern": pages and components call these methods
 * and never touch localStorage (or, later, a server) directly. Today the
 * methods are implemented in localStorageRepository.ts. When DevPath gets a
 * real database, we write a second implementation, e.g. apiRepository.ts, that
 * sends the same requests over the internet, and no page has to change.
 *
 * Why does every method return a Promise (an "I'll give you the answer
 * later" value)? localStorage answers instantly, but a database across the
 * internet takes time. Making the methods async from day one means the code
 * that calls them is already written the right way for that future.
 */
export interface DevPathRepository {
  /** Progress for every topic you've touched. Topics missing here are "not-started". */
  getAllProgress(): Promise<Record<string, TopicProgress>>

  /** Mark a topic as not-started / learning / done. Returns the saved record. */
  setTopicStatus(topicId: string, status: TopicStatus): Promise<TopicProgress>

  /** All quiz attempts, oldest first, or only those for one topic. */
  getQuizAttempts(topicId?: string): Promise<QuizAttempt[]>

  /** Save a finished quiz. The repository fills in the id and the time. */
  addQuizAttempt(attempt: Pick<QuizAttempt, 'topicId' | 'score' | 'total'>): Promise<QuizAttempt>

  /** Everything you've saved, as a JSON text you can keep as a backup file. */
  exportData(): Promise<string>

  /** Replace everything with a backup made by exportData(). Throws a friendly Error if the text isn't valid. */
  importData(json: string): Promise<void>

  /** Delete everything. There is no undo! */
  clearAll(): Promise<void>
}
