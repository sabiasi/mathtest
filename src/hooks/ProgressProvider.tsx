import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { repo } from '../data'
import type { TopicProgress, TopicStatus } from '../data/types'
import { ProgressContext, type ProgressContextValue } from './ProgressContext'

/** Turns any thrown value into a readable sentence. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Loads your progress once, keeps it in React state, and saves changes
 * through the repository. Wrap the app in this (see App.tsx).
 */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Record<string, TopicProgress>>({})
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // useCallback keeps the SAME function between redraws, so components that
  // receive it don't redraw for no reason.
  const reload = useCallback(async () => {
    try {
      setProgress(await repo.getAllProgress())
      setError(null)
    } catch (e) {
      setError(`Couldn't load your progress: ${messageOf(e)}`)
    } finally {
      setLoaded(true)
    }
  }, [])

  // Read the saved data once, when the app starts. State is only set inside
  // .then() callbacks, after the data arrives. `cancelled` makes us ignore a
  // late answer if this component has already gone away (React's StrictMode
  // deliberately runs effects twice in development to catch exactly that).
  useEffect(() => {
    let cancelled = false
    repo
      .getAllProgress()
      .then((saved) => {
        if (!cancelled) setProgress(saved)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(`Couldn't load your progress: ${messageOf(e)}`)
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setStatus = useCallback(async (topicId: string, status: TopicStatus) => {
    try {
      const record = await repo.setTopicStatus(topicId, status)
      // Copy the old object and replace one entry. React only notices
      // changes when it gets a NEW object, never when one is edited in place.
      setProgress((previous) => ({ ...previous, [topicId]: record }))
      setError(null)
    } catch (e) {
      setError(`Couldn't save your progress: ${messageOf(e)}`)
    }
  }, [])

  const statusOf = useCallback(
    (topicId: string): TopicStatus => progress[topicId]?.status ?? 'not-started',
    [progress],
  )

  // useMemo: only build a new value object when something in it changed.
  const value = useMemo<ProgressContextValue>(
    () => ({ progress, loaded, error, statusOf, setStatus, reload }),
    [progress, loaded, error, statusOf, setStatus, reload],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}
