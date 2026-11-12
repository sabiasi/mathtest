import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { Stage, Topic } from '../../data/content'
import type { TopicStatus } from '../../data/types'
import { progressStats } from './progressStats'

/*
  Where does every box on the map go? This file answers that, and nothing else.

  The layout is a simple grid that reads top to bottom like a page: each stage
  gets a label on the left, and its topics fill rows of TOPICS_PER_ROW, left to
  right. Because positions are calculated from roadmap.json, adding a topic
  there automatically gives it a spot on the map. No coordinates to type by hand.
*/

/** How many topic boxes sit side by side. Fewer = bigger, easier-to-read boxes. */
export const TOPICS_PER_ROW = 3

export const NODE_WIDTH = 200
export const NODE_HEIGHT = 92
export const STAGE_WIDTH = 168
const COLUMN_GAP = 36
/** Space between two rows of the SAME stage. */
const ROW_GAP = 44
/** Space between two stages (a bit bigger, so stages look like groups). */
const STAGE_ROW_GAP = 96
/** Space between a stage's label and its first topic. */
const STAGE_GAP = 40

// React Flow requires node data to be a "type", not an "interface".
export type TopicNodeData = { topic: Topic; status: TopicStatus; highlighted: boolean }
export type StageNodeData = { stage: Stage; number: number; done: number; learning: number; total: number }

export type TopicFlowNode = Node<TopicNodeData, 'topic'>
export type StageFlowNode = Node<StageNodeData, 'stage'>
export type RoadmapNode = TopicFlowNode | StageFlowNode

export function buildRoadmapGraph(
  stages: Stage[],
  statusOf: (topicId: string) => TopicStatus,
  selectedId: string | null,
): { nodes: RoadmapNode[]; edges: Edge[] } {
  const nodes: RoadmapNode[] = []
  const edges: Edge[] = []
  // Remember each topic's grid spot, to choose how its arrows are drawn.
  const spot = new Map<string, { row: number; column: number }>()

  // Topics connected to the selected one get highlighted too.
  const selected = stages.flatMap((s) => s.topics).find((t) => t.id === selectedId)
  const related = new Set(selected ? [selected.id, ...selected.prerequisites] : [])
  for (const topic of stages.flatMap((s) => s.topics)) {
    if (selectedId && topic.prerequisites.includes(selectedId)) related.add(topic.id)
  }

  let stageTop = 0 // y position where the current stage starts
  let firstRow = 0 // grid row number of the current stage's first row

  stages.forEach((stage, index) => {
    const rows = Math.max(1, Math.ceil(stage.topics.length / TOPICS_PER_ROW))
    const stageHeight = rows * NODE_HEIGHT + (rows - 1) * ROW_GAP
    const stats = progressStats(stage.topics, statusOf)

    nodes.push({
      id: `stage:${stage.id}`,
      type: 'stage',
      position: { x: 0, y: stageTop },
      width: STAGE_WIDTH,
      height: stageHeight,
      selectable: false,
      data: { stage, number: index + 1, done: stats.done, learning: stats.learning, total: stats.total },
    })

    stage.topics.forEach((topic, i) => {
      // Topic number i goes in row i ÷ 3 (rounded down), column i % 3 (the remainder).
      const rowInStage = Math.floor(i / TOPICS_PER_ROW)
      const column = i % TOPICS_PER_ROW
      spot.set(topic.id, { row: firstRow + rowInStage, column })
      nodes.push({
        id: topic.id,
        type: 'topic',
        position: {
          x: STAGE_WIDTH + STAGE_GAP + column * (NODE_WIDTH + COLUMN_GAP),
          y: stageTop + rowInStage * (NODE_HEIGHT + ROW_GAP),
        },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        selected: topic.id === selectedId,
        data: { topic, status: statusOf(topic.id), highlighted: related.has(topic.id) },
      })
    })

    firstRow += rows
    stageTop += stageHeight + STAGE_ROW_GAP
  })

  // One arrow per prerequisite: from "learn this first" to the topic.
  for (const topic of stages.flatMap((s) => s.topics)) {
    for (const prerequisite of topic.prerequisites) {
      const from = spot.get(prerequisite)
      const to = spot.get(topic.id)
      if (!from || !to) continue

      const sameRow = from.row === to.row
      const sideBySide = sameRow && to.column - from.column === 1
      const highlighted = selectedId === topic.id || selectedId === prerequisite

      edges.push({
        id: `${prerequisite}->${topic.id}`,
        source: prerequisite,
        target: topic.id,
        // Neighbors: a short arrow between their sides. Same row but further
        // apart: loop underneath, so the arrow doesn't cross the boxes between.
        // Different rows: from the bottom of one to the top of the other.
        sourceHandle: sideBySide ? 'right' : 'bottom',
        targetHandle: sideBySide ? 'left' : sameRow ? 'bottom-in' : 'top',
        type: sameRow && !sideBySide ? 'smoothstep' : 'default',
        animated: highlighted,
        className: highlighted ? 'roadmap-edge is-highlighted' : sameRow ? 'roadmap-edge' : 'roadmap-edge is-faint',
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        zIndex: highlighted ? 10 : 0,
      })
    }
  }

  return { nodes, edges }
}
