import type { Topic } from '../../data/content'
import type { TopicStatus } from '../../data/types'

export interface ProgressStats {
  done: number
  learning: number
  total: number
  /** Estimated hours for the topics that aren't done yet. */
  hoursLeft: number
}

/**
 * Counts how far along you are in a group of topics (one stage, or all of them).
 * It's a "pure function": the same input always gives the same output, and it
 * changes nothing else. Pure functions are the easiest code to test.
 */
export function progressStats(topics: Topic[], statusOf: (id: string) => TopicStatus): ProgressStats {
  let done = 0
  let learning = 0
  let hoursLeft = 0
  for (const topic of topics) {
    const status = statusOf(topic.id)
    if (status === 'done') done += 1
    else hoursLeft += topic.hours
    if (status === 'learning') learning += 1
  }
  return { done, learning, total: topics.length, hoursLeft }
}

/** The topic to continue with: the first one you're learning, else the first not started. */
export function nextTopic(topics: Topic[], statusOf: (id: string) => TopicStatus): Topic | undefined {
  return (
    topics.find((topic) => statusOf(topic.id) === 'learning') ??
    topics.find((topic) => statusOf(topic.id) === 'not-started')
  )
}
