import { describe, expect, it } from 'vitest'
import type { Stage, Topic } from '../../data/content'
import type { TopicStatus } from '../../data/types'
import { buildRoadmapGraph } from './layout'
import { nextTopic, progressStats } from './progressStats'

// A tiny, made-up roadmap. Tests use their own small data so they don't
// break every time the real content changes.
function topic(id: string, prerequisites: string[] = [], hours = 1): Topic {
  return { id, title: id, summary: '', why: '', hours, prerequisites, resources: [] }
}

const stages: Stage[] = [
  { id: 's1', title: 'Stage 1', summary: '', topics: [topic('a'), topic('b', ['a']), topic('c', ['a'])] },
  { id: 's2', title: 'Stage 2', summary: '', topics: [topic('d', ['c'], 5)] },
]

const allNotStarted = (): TopicStatus => 'not-started'

describe('buildRoadmapGraph', () => {
  it('makes one node per stage and per topic, and one edge per prerequisite', () => {
    const { nodes, edges } = buildRoadmapGraph(stages, allNotStarted, null)
    expect(nodes).toHaveLength(2 + 4)
    expect(edges.map((e) => e.id)).toEqual(['a->b', 'a->c', 'c->d'])
  })

  it('puts each stage on its own row, below the previous one', () => {
    const { nodes } = buildRoadmapGraph(stages, allNotStarted, null)
    const y = (id: string) => nodes.find((n) => n.id === id)!.position.y
    expect(y('a')).toBe(y('c'))
    expect(y('d')).toBeGreaterThan(y('a'))
  })

  it('wraps a stage onto a new row after TOPICS_PER_ROW topics', () => {
    const big: Stage[] = [
      { id: 'big', title: 'Big', summary: '', topics: [topic('t1'), topic('t2'), topic('t3'), topic('t4', ['t3'])] },
    ]
    const { nodes, edges } = buildRoadmapGraph(big, allNotStarted, null)
    const pos = (id: string) => nodes.find((n) => n.id === id)!.position
    expect(pos('t4').x).toBe(pos('t1').x) // back to the first column…
    expect(pos('t4').y).toBeGreaterThan(pos('t1').y) // …one row down
    // t3 → t4 now crosses rows, so it runs bottom → top.
    expect(edges[0]).toMatchObject({ sourceHandle: 'bottom', targetHandle: 'top' })
  })

  it('connects side-by-side topics with side handles, and loops under otherwise', () => {
    const { edges } = buildRoadmapGraph(stages, allNotStarted, null)
    const edge = (id: string) => edges.find((e) => e.id === id)!
    expect(edge('a->b')).toMatchObject({ sourceHandle: 'right', targetHandle: 'left' })
    expect(edge('a->c')).toMatchObject({ sourceHandle: 'bottom', targetHandle: 'bottom-in' })
    expect(edge('c->d')).toMatchObject({ sourceHandle: 'bottom', targetHandle: 'top' })
  })

  it('highlights the selected topic, its prerequisites and the topics that need it', () => {
    const { nodes, edges } = buildRoadmapGraph(stages, allNotStarted, 'c')
    const highlighted = nodes
      .filter((n) => n.type === 'topic' && n.data.highlighted)
      .map((n) => n.id)
    expect(highlighted.sort()).toEqual(['a', 'c', 'd'])
    expect(edges.filter((e) => e.animated).map((e) => e.id)).toEqual(['a->c', 'c->d'])
  })
})

describe('progressStats and nextTopic', () => {
  const statuses: Record<string, TopicStatus> = { a: 'done', b: 'learning' }
  const statusOf = (id: string) => statuses[id] ?? 'not-started'
  const topics = stages.flatMap((s) => s.topics)

  it('counts done and learning topics and the hours left', () => {
    expect(progressStats(topics, statusOf)).toEqual({ done: 1, learning: 1, total: 4, hoursLeft: 1 + 1 + 5 })
  })

  it('suggests the topic you are learning before a new one', () => {
    expect(nextTopic(topics, statusOf)?.id).toBe('b')
    expect(nextTopic(topics, () => 'done')).toBeUndefined()
  })
})
