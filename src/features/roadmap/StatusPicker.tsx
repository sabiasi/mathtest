import { useProgress } from '../../hooks/ProgressContext'
import { statusInfo, statusOrder } from './status'

interface StatusPickerProps {
  topicId: string
  /** Smaller text that stretches to fill the width: for narrow spaces like the map's side panel. */
  compact?: boolean
}

/** Three buttons to set a topic's status. Used on the map panel and the topic page. */
export function StatusPicker({ topicId, compact = false }: StatusPickerProps) {
  const { statusOf, setStatus } = useProgress()
  const current = statusOf(topicId)

  return (
    <div
      role="radiogroup"
      aria-label="Your status for this topic"
      className={`rounded-lg bg-slate-100 p-1 dark:bg-slate-800 ${compact ? 'flex w-full' : 'inline-flex'}`}
    >
      {statusOrder.map((status) => {
        const selected = status === current
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => void setStatus(topicId, status)}
            className={`flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              compact ? 'flex-1 px-1.5 py-1.5 text-xs' : 'px-3 py-1.5 text-sm'
            } ${
              selected
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span className={`size-2 shrink-0 rounded-full ${statusInfo[status].dot}`} aria-hidden="true" />
            {statusInfo[status].label}
          </button>
        )
      })}
    </div>
  )
}
