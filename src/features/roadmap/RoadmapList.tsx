import { Clock } from 'lucide-react'
import { Link } from 'react-router'
import { ProgressBar } from '../../components/ProgressBar'
import { stages } from '../../data/content'
import { useProgress } from '../../hooks/ProgressContext'
import { progressStats } from './progressStats'
import { StatusBadge } from './StatusBadge'

/**
 * The same roadmap as a simple list. It's easier on phones, and it works fully
 * with a keyboard and screen readers. Offering a list view next to a visual one
 * is a good accessibility habit.
 */
export function RoadmapList() {
  const { statusOf } = useProgress()

  return (
    <div className="space-y-8">
      {stages.map((stage, index) => {
        const stats = progressStats(stage.topics, statusOf)
        return (
          <section key={stage.id} aria-labelledby={`stage-${stage.id}`}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <div>
                <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase dark:text-brand-400">
                  Stage {index + 1}
                </p>
                <h2 id={`stage-${stage.id}`} className="text-lg font-semibold text-slate-900 dark:text-white">
                  {stage.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{stage.summary}</p>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {stats.done} of {stats.total} done
              </p>
            </div>
            <div className="mb-3">
              <ProgressBar done={stats.done} learning={stats.learning} total={stats.total} label={`${stage.title} progress`} />
            </div>

            <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {stage.topics.map((topic) => (
                <li key={topic.id}>
                  <Link
                    to={`/roadmap/${topic.id}`}
                    className="flex flex-col gap-2 p-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-start sm:gap-4 dark:hover:bg-slate-800/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{topic.title}</p>
                      <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{topic.summary}</p>
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-500">
                        <span className="font-medium">Why it matters:</span> {topic.why}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                      <StatusBadge status={statusOf(topic.id)} />
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Clock size={12} aria-hidden="true" />~{topic.hours}h
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
