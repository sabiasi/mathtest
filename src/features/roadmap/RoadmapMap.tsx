import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  useReactFlow,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMemo } from 'react'
import { stages } from '../../data/content'
import { useProgress } from '../../hooks/ProgressContext'
import { useIsDarkMode } from '../../hooks/useIsDarkMode'
import { buildRoadmapGraph, type RoadmapNode } from './layout'
import { StageNode } from './StageNode'
import { TopicNode } from './TopicNode'

// Defined OUTSIDE the component on purpose: React Flow would treat a new
// object on every redraw as "the node types changed" and rebuild everything.
const nodeTypes = { topic: TopicNode, stage: StageNode }

// At first, zoom in on the first two stages instead of showing all ten tiny.
const initialView = {
  nodes: stages.slice(0, 2).flatMap((s) => [{ id: `stage:${s.id}` }, ...s.topics.map((t) => ({ id: t.id }))]),
  padding: 0.06,
  maxZoom: 1,
}

/** A dropdown that glides the map to a stage. */
function StageJump() {
  // useReactFlow gives access to the map's camera (zoom and pan).
  const { fitView } = useReactFlow()
  return (
    <select
      aria-label="Jump to stage"
      defaultValue=""
      onChange={(event) => {
        const stage = stages.find((s) => s.id === event.target.value)
        if (!stage) return
        void fitView({
          nodes: [{ id: `stage:${stage.id}` }, ...stage.topics.map((t) => ({ id: t.id }))],
          duration: 600, // animate over 0.6 seconds
          padding: 0.2,
          maxZoom: 1,
        })
      }}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <option value="" disabled>
        Jump to stage…
      </option>
      {stages.map((stage, i) => (
        <option key={stage.id} value={stage.id}>
          {i + 1}. {stage.title}
        </option>
      ))}
    </select>
  )
}

interface RoadmapMapProps {
  selectedId: string | null
  onSelect: (topicId: string | null) => void
}

/**
 * The interactive map. Scroll (or drag) to move around, like a page.
 * Pinch, or use the +/− buttons, to zoom.
 */
export function RoadmapMap({ selectedId, onSelect }: RoadmapMapProps) {
  const { statusOf } = useProgress()
  const isDark = useIsDarkMode()

  // Rebuild the graph only when progress or the selection changes.
  const { nodes, edges } = useMemo(
    () => buildRoadmapGraph(stages, statusOf, selectedId),
    [statusOf, selectedId],
  )

  const handleNodeClick: NodeMouseHandler<RoadmapNode> = (_event, node) => {
    if (node.type === 'topic') onSelect(node.id)
  }

  return (
    <div className="h-[65vh] min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode={isDark ? 'dark' : 'light'}
        onNodeClick={handleNodeClick}
        onPaneClick={() => onSelect(null)}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        fitViewOptions={initialView}
        minZoom={0.2}
        maxZoom={1.5}
        // The scroll wheel moves the map (like scrolling a page) instead of
        // zooming, which surprises people. Pinch on a trackpad still zooms.
        panOnScroll
        zoomOnScroll={false}
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} position="bottom-left" />
        <Panel position="top-left">
          <StageJump />
        </Panel>
      </ReactFlow>
    </div>
  )
}
