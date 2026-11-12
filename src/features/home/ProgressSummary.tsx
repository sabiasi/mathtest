import { ArrowRight, Target } from 'lucide-react'
import { Link } from 'react-router'
import { ProgressBar } from '../../components/ProgressBar'
import { allTopics, getStageOf } from '../../data/content'
import { useProgress } from '../../hooks/ProgressContext'
import { nextTopic, progressStats } from '../roadmap/progressStats'

/** "You're here, do this next": the first thing on the Home page. */
export function ProgressSummary() {
  const { statusOf, loaded } = useProgress()
  // Don't flash "0 of 46" for a split second while saved data is loading.
  if (!loaded) return null

  const stats = progressStats(allTopics, statusOf)
  const next = nextTopic(allTopics, statusOf)
  const continuing = next && statusOf(next.id) === 'learning'

  return (
    <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.done}</span> of{' '}
            {stats.total} topics done
            {stats.learning > 0 && <> · {stats.learning} in progress</>}
          </p>
          <div className="mt-2 max-w-md">
            <ProgressBar done={stats.done} learning={stats.learning} total={stats.total} label="Overall progress" />
          </div>
        </div>

        {next ? (
          <Link
            to={`/roadmap/${next.id}`}
            className="group flex items-center gap-3 rounded-xl bg-brand-600 px-4 py-3 text-white hover:bg-brand-700"
          >
            <Target size={20} aria-hidden="true" />
            <span>
              <span className="block text-xs text-brand-100">{continuing ? 'Continue' : 'Start next'} · {getStageOf(next.id)?.title}</span>
              <span className="block font-medium">{next.title}</span>
            </span>
            <ArrowRight size={18} className="transition group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        ) : (
          <p className="font-medium text-emerald-700 dark:text-emerald-400">🎉 You've finished the whole roadmap!</p>
        )}
      </div>
    </section>
  )
}
