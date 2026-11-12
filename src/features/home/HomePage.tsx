import { ArrowRight, Compass } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { BUILT_UP_TO_PHASE, navGroups } from '../../layout/navigation'
import { DataBackup } from './DataBackup'
import { ProgressSummary } from './ProgressSummary'

/** The welcome page: what DevPath is, and a card for each area of the app. */
export function HomePage() {
  // Every group except "Start" (that's this page) becomes a section of cards.
  const sections = navGroups.filter((group) => group.title !== 'Start')

  return (
    <>
      <PageHeader
        title="Welcome to DevPath 👋"
        intro="Your personal guide from absolute beginner to job-ready developer. Follow the roadmap, see how things work, track your growth, and get ready for interviews, one small step at a time."
      />

      <ProgressSummary />

      <div className="mb-10 flex items-start gap-4 rounded-2xl bg-brand-50 p-5 dark:bg-brand-950/60">
        <Compass className="mt-0.5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
        <div className="text-sm text-brand-900 dark:text-brand-100">
          <p className="font-medium">How to use DevPath</p>
          <p className="mt-1">
            Start with the <strong>Roadmap</strong>. Pick a topic, read the short lesson,
            take the quiz, then mark it as done. Everything you do is saved in{' '}
            <em>this browser</em> on this computer: there's no account to create.
          </p>
        </div>
      </div>

      {sections.map((group) => (
        <section key={group.title} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            {group.title}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => {
              const Icon = item.icon
              const ready = item.phase <= BUILT_UP_TO_PHASE
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Icon className="text-brand-600 dark:text-brand-400" aria-hidden="true" />
                    {!ready && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        Phase {item.phase}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-400">
                    {item.summary}
                  </p>
                  <ArrowRight
                    size={16}
                    className="mt-3 text-slate-400 transition group-hover:translate-x-1 group-hover:text-brand-600"
                    aria-hidden="true"
                  />
                </Link>
              )
            })}
          </div>
        </section>
      ))}

      <DataBackup />
    </>
  )
}
