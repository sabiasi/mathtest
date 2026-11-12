import type { DevPathRepository } from './repository'
import type { SavedData } from './types'

/**
 * localStorage is a small key → text store built into every browser. It keeps
 * data after you close the tab, but only in THIS browser on THIS computer.
 */

/** The key all DevPath data is saved under. */
export const DATA_KEY = 'devpath:data'
/** If saved data is ever unreadable, we keep a copy here instead of losing it. */
export const CORRUPT_BACKUP_KEY = 'devpath:data:corrupt'

/** Bump this when the SavedData shape changes, and add a step to migrate(). */
export const CURRENT_SCHEMA_VERSION = 1

/**
 * Just the three localStorage methods we use. Asking for this small shape
 * instead of grabbing `window.localStorage` directly means tests can pass in a
 * simple fake, so they run fast without a real browser. This trick is called
 * "dependency injection".
 */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function emptyData(): SavedData {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, progress: {}, quizAttempts: [] }
}

/** A light check that some parsed JSON really looks like SavedData. */
function isSavedData(value: unknown): value is SavedData {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Record<string, unknown>
  return (
    typeof data.schemaVersion === 'number' &&
    typeof data.progress === 'object' &&
    data.progress !== null &&
    !Array.isArray(data.progress) &&
    Array.isArray(data.quizAttempts)
  )
}

/**
 * Upgrades data saved by an older version of DevPath to the current shape.
 * There's only version 1 so far. A future step would look like:
 *   if (data.schemaVersion === 1) { ...add the new field...; data.schemaVersion = 2 }
 */
function migrate(data: SavedData): SavedData {
  if (data.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      'This data was saved by a newer version of DevPath. Please update the app first.',
    )
  }
  return data
}

export function createLocalStorageRepository(storage: KeyValueStorage): DevPathRepository {
  /** Read everything from storage, or start fresh if nothing is there yet. */
  function load(): SavedData {
    const raw = storage.getItem(DATA_KEY)
    if (raw === null) return emptyData()

    try {
      const parsed: unknown = JSON.parse(raw)
      if (isSavedData(parsed)) return migrate(parsed)
    } catch (error) {
      // A "newer version" error must reach the user; only parse errors are recovered from.
      if (!(error instanceof SyntaxError)) throw error
    }

    // The saved text is broken (maybe edited by hand). Rather than crash, we
    // keep a copy so nothing is truly lost, then start fresh.
    storage.setItem(CORRUPT_BACKUP_KEY, raw)
    console.warn(`DevPath: saved data was unreadable. A copy was kept under "${CORRUPT_BACKUP_KEY}".`)
    return emptyData()
  }

  function save(data: SavedData): void {
    storage.setItem(DATA_KEY, JSON.stringify(data))
  }

  // Each method loads, changes, and saves. That's simple and plenty fast for
  // the small amount of data one learner creates.
  return {
    async getAllProgress() {
      return load().progress
    },

    async setTopicStatus(topicId, status) {
      const data = load()
      const record = { topicId, status, updatedAt: new Date().toISOString() }
      data.progress[topicId] = record
      save(data)
      return record
    },

    async getQuizAttempts(topicId) {
      const attempts = load().quizAttempts
      return topicId === undefined ? attempts : attempts.filter((a) => a.topicId === topicId)
    },

    async addQuizAttempt({ topicId, score, total }) {
      const data = load()
      const attempt = {
        id: crypto.randomUUID(), // a random unique id like "3f2b8c1e-…"
        topicId,
        score,
        total,
        takenAt: new Date().toISOString(),
      }
      data.quizAttempts.push(attempt)
      save(data)
      return attempt
    },

    async exportData() {
      // The extra arguments (null, 2) indent the JSON so the backup is readable.
      return JSON.stringify(load(), null, 2)
    },

    async importData(json) {
      let parsed: unknown
      try {
        parsed = JSON.parse(json)
      } catch {
        throw new Error("That file isn't valid JSON, so it can't be a DevPath backup.")
      }
      if (!isSavedData(parsed)) {
        throw new Error("That file is JSON, but it doesn't look like a DevPath backup.")
      }
      save(migrate(parsed))
    },

    async clearAll() {
      storage.removeItem(DATA_KEY)
    },
  }
}
