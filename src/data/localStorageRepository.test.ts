import { beforeEach, describe, expect, it } from 'vitest'
import {
  CORRUPT_BACKUP_KEY,
  DATA_KEY,
  createLocalStorageRepository,
  type KeyValueStorage,
} from './localStorageRepository'

/**
 * Tests are small programs that check our code does what we think it does.
 * Run them with:  npm test
 *
 * Each `it(...)` is one test. It sets something up, does one action, and uses
 * `expect(...)` to check the result. If a check fails, Vitest shows exactly
 * which one and what value it got instead.
 */

/** A pretend localStorage that lives in memory, so tests don't need a browser. */
function createFakeStorage(): KeyValueStorage & { dump: Map<string, string> } {
  const dump = new Map<string, string>()
  return {
    dump,
    getItem: (key) => dump.get(key) ?? null,
    setItem: (key, value) => void dump.set(key, value),
    removeItem: (key) => void dump.delete(key),
  }
}

describe('localStorage repository', () => {
  let storage: ReturnType<typeof createFakeStorage>

  // Runs before EACH test, so every test starts with empty storage and no test
  // can accidentally depend on another one.
  beforeEach(() => {
    storage = createFakeStorage()
  })

  it('starts with no progress and no quiz attempts', async () => {
    const repo = createLocalStorageRepository(storage)
    expect(await repo.getAllProgress()).toEqual({})
    expect(await repo.getQuizAttempts()).toEqual([])
  })

  it('remembers a topic status, even in a new repository (like reopening the app)', async () => {
    await createLocalStorageRepository(storage).setTopicStatus('variables', 'learning')

    const reopened = createLocalStorageRepository(storage)
    const progress = await reopened.getAllProgress()
    expect(progress.variables.status).toBe('learning')
  })

  it('gives each quiz attempt an id and time, and can filter by topic', async () => {
    const repo = createLocalStorageRepository(storage)
    const first = await repo.addQuizAttempt({ topicId: 'binary', score: 2, total: 3 })
    await repo.addQuizAttempt({ topicId: 'variables', score: 3, total: 3 })

    expect(first.id).toBeTruthy()
    expect(first.takenAt).toMatch(/^\d{4}-\d{2}-\d{2}T/) // looks like an ISO date
    expect(await repo.getQuizAttempts('binary')).toHaveLength(1)
    expect(await repo.getQuizAttempts()).toHaveLength(2)
  })

  it('can export a backup and import it somewhere else', async () => {
    const original = createLocalStorageRepository(storage)
    await original.setTopicStatus('git', 'done')
    const backup = await original.exportData()

    const otherComputer = createLocalStorageRepository(createFakeStorage())
    await otherComputer.importData(backup)
    expect((await otherComputer.getAllProgress()).git.status).toBe('done')
  })

  it('rejects an import that is not valid JSON, with a friendly message', async () => {
    const repo = createLocalStorageRepository(storage)
    await expect(repo.importData('not json {')).rejects.toThrow(/isn't valid JSON/)
  })

  it('rejects valid JSON that is not a DevPath backup', async () => {
    const repo = createLocalStorageRepository(storage)
    await expect(repo.importData('{"hello": "world"}')).rejects.toThrow(/doesn't look like/)
  })

  it('refuses data from a newer version of the app instead of misreading it', async () => {
    const repo = createLocalStorageRepository(storage)
    const future = JSON.stringify({ schemaVersion: 99, progress: {}, quizAttempts: [] })
    await expect(repo.importData(future)).rejects.toThrow(/newer version/)
  })

  it('survives broken saved data and keeps a copy of it', async () => {
    storage.setItem(DATA_KEY, '{ this is broken')
    const repo = createLocalStorageRepository(storage)

    expect(await repo.getAllProgress()).toEqual({})
    expect(storage.dump.get(CORRUPT_BACKUP_KEY)).toBe('{ this is broken')
  })

  it('clearAll deletes everything', async () => {
    const repo = createLocalStorageRepository(storage)
    await repo.setTopicStatus('dns', 'done')
    await repo.clearAll()
    expect(await repo.getAllProgress()).toEqual({})
  })
})
