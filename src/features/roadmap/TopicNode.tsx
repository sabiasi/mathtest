import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Check, Clock } from 'lucide-react'
import { memo } from 'react'
import type { TopicFlowNode } from './layout'
import { statusInfo } from './status'

// Invisible connection points. The arrows need them, but you can't drag them.
const hidden = { opacity: 0, pointerEvents: 'none' as const }

/** One topic box on the map. */
function TopicNodeComponent({ data, selected }: NodeProps<TopicFlowNode>) {
  const { topic, status, highlighted } = data
  const info = statusInfo[status]

  return (
    <div
      className={`flex h-full w-full cursor-pointer flex-col rounded-xl border-2 bg-white px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${info.card} ${
        selected ? 'ring-4 ring-brand-500/40' : highlighted ? 'ring-2 ring-brand-400/30' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} id="top" style={hidden} isConnectable={false} />
      <Handle type="target" position={Position.Left} id="left" style={hidden} isConnectable={false} />
      <Handle type="target" position={Position.Bottom} id="bottom-in" style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Right} id="right" style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={hidden} isConnectable={false} />

      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          {status === 'done' ? (
            <Check size={12} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          ) : (
            <span className={`size-2 rounded-full ${info.dot}`} aria-hidden="true" />
          )}
          {info.label}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={11} aria-hidden="true" />~{topic.hours}h
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm leading-snug font-semibold text-slate-900 dark:text-white">
        {topic.title}
      </p>
    </div>
  )
}

// memo: only redraw a node when ITS data changes, not when any node changes.
// With ~50 nodes this keeps the map smooth.
export const TopicNode = memo(TopicNodeComponent)
