import type { NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { ProgressBar } from '../../components/ProgressBar'
import type { StageFlowNode } from './layout'

/** The label at the start of each row: "Stage 1 · Foundations · 2/5". */
function StageNodeComponent({ data }: NodeProps<StageFlowNode>) {
  const { stage, number, done, learning, total } = data
  return (
    <div className="flex h-full w-full flex-col justify-center rounded-xl bg-slate-100/80 px-3 dark:bg-slate-800/60">
      <p className="text-[11px] font-semibold tracking-wide text-brand-700 uppercase dark:text-brand-400">
        Stage {number}
      </p>
      <p className="text-sm leading-tight font-semibold text-slate-900 dark:text-white">{stage.title}</p>
      <div className="mt-2 flex items-center gap-2">
        <ProgressBar done={done} learning={learning} total={total} label={`${stage.title} progress`} />
        <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
          {done}/{total}
        </span>
      </div>
    </div>
  )
}

export const StageNode = memo(StageNodeComponent)
