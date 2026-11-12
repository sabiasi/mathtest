import { ArrowRight, Clock, MousePointerClick, X } from 'lucide-react'
import { Link } from 'react-router'
import { getStageOf, getTopic } from '../../data/content'
import { useProgress } from '../../hooks/ProgressContext'
import { StatusBadge } from './StatusBadge'
import { StatusPicker } from './StatusPicker'
import { statusInfo, statusOrder } from './status'

interface TopicPanelProps {
  topicId: string | null
  onSelect: (topicId: string | null) => void
}

/** The details card next to the map for the topic you clicked. */
export function TopicPanel({ topicId, onSelect }: TopicPanelProps) {
  const { statusOf } = useProgress()
  const topic = topicId ? getTopic(topicId) : undefined

  // Nothing selected yet: explain how the map works instead.
  if (!topic) {
    return (
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <MousePointerClick className="text-brand-600 dark:text-brand-400" aria-hidden="true" />
        <p className="mt-3 font-medium text-slate-900 dark:text-white">Click a topic on the map</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          You'll see why it matters, how long it takes, and a link to its lesson. Arrows point from
          “learn this first” to what comes next.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {statusOrder.map((status) => (
            <li key={status} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className={`size-3 rounded-full ${statusInfo[status].dot}`} aria-hidden="true" />
              {statusInfo[status].label}
            </li>
          ))}
        </ul>
      </aside>
    )
  }

  const stage = getStageOf(topic.id)
  const prerequisites = topic.prerequisites.map(getTopic).filter((t) => t !== undefined)

  return (
    <aside
      aria-label={`${topic.title} details`}
      className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase dark:text-brand-400">
          {stage?.title}
        </p>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="-mt-1 -mr-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Close details"
        >
          <X size={16} />
        </button>
      </div>
      <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{topic.title}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <StatusBadge status={statusOf(topic.id)} />
        <span className="flex items-center gap-1">
          <Clock size={12} aria-hidden="true" /> about {topic.hours} {topic.hours === 1 ? 'hour' : 'hours'}
        </span>
      </div>

      <p className="mt-4 text-sm text-slate-700 dark:text-slate-300">{topic.summary}</p>

      <h3 className="mt-4 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        Why it matters
      </h3>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{topic.why}</p>

      {prerequisites.length > 0 && (
        <>
          <h3 className="mt-4 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Good to know first
          </h3>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {prerequisites.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-brand-950 dark:hover:text-brand-200"
                >
                  {p.title}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-5">
        <StatusPicker topicId={topic.id} compact />
      </div>

      <Link
        to={`/roadmap/${topic.id}`}
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
      >
        Open the lesson <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </aside>
  )
}
