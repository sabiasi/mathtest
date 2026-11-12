import { Check } from 'lucide-react'
import type { TopicStatus } from '../../data/types'
import { statusInfo } from './status'

/** A small colored pill: "Not started" / "Learning" / "Done". */
export function StatusBadge({ status }: { status: TopicStatus }) {
  const info = statusInfo[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${info.badge}`}>
      {status === 'done' ? (
        <Check size={12} strokeWidth={3} aria-hidden="true" />
      ) : (
        <span className={`size-2 rounded-full ${info.dot}`} aria-hidden="true" />
      )}
      {info.label}
    </span>
  )
}
