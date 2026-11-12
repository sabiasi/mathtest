import { createContext, useContext } from 'react'
import type { TopicProgress, TopicStatus } from '../data/types'

/**
 * Your progress on every topic, shared by every page.
 *
 * Why "context"? The roadmap map, the topic page and the Home page all need
 * the same progress data. Passing it down through every component in between
 * ("prop drilling") gets messy. A React context makes it available to any
 * component that calls useProgress(), and when it changes, all of them redraw.
 */
export interface ProgressContextValue {
  progress: Record<string, TopicProgress>
  /** false until the saved data has been read for the first time. */
  loaded: boolean
  /** A friendly message if saving or loading failed, otherwise null. */
  error: string | null
  statusOf: (topicId: string) => TopicStatus
  setStatus: (topicId: string, status: TopicStatus) => Promise<void>
  /** Read everything again, e.g. after importing a backup. */
  reload: () => Promise<void>
}

export const ProgressContext = createContext<ProgressContextValue | null>(null)

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext)
  if (!value) {
    // This only happens if a component is used outside <ProgressProvider>:
    // a programming mistake, so we fail loudly with a clear message.
    throw new Error('useProgress() must be used inside <ProgressProvider>.')
  }
  return value
}
