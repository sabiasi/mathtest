import { ChevronLeft, ChevronRight, Clock, Lightbulb, Sprout } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { getNeighbors, getStageOf, getTopic } from '../../data/content'
import { getLesson, getQuiz } from '../../data/lessons'
import { StatusPicker } from '../roadmap/StatusPicker'
import { LessonContent } from './LessonContent'
import { Quiz } from './Quiz'
import { ResourceList } from './ResourceList'

/** One topic's page: /roadmap/:topicId, e.g. /roadmap/variables */
export function TopicPage() {
  // useParams reads the ":topicId" part of the URL.
  const { topicId = '' } = useParams()
  const topic = getTopic(topicId)

  if (!topic) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Topic not found</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          There's no topic called “{topicId}”.{' '}
          <Link to="/roadmap" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
            Back to the roadmap
          </Link>
        </p>
      </div>
    )
  }

  const stage = getStageOf(topic.id)
  const lesson = getLesson(topic.id)
  const quiz = getQuiz(topic.id)
  const { previous, next } = getNeighbors(topic.id)
  const prerequisites = topic.prerequisites.map(getTopic).filter((t) => t !== undefined)

  return (
    <article className="mx-auto max-w-3xl">
      {/* Breadcrumb: shows where you are, and links back up. */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        <Link to="/roadmap" className="hover:text-brand-700 dark:hover:text-brand-400">
          Roadmap
        </Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span>{stage?.title}</span>
      </nav>

      <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{topic.title}</h1>
      <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{topic.summary}</p>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <StatusPicker topicId={topic.id} />
        <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Clock size={15} aria-hidden="true" /> About {topic.hours} {topic.hours === 1 ? 'hour' : 'hours'}
        </span>
      </div>

      {prerequisites.length > 0 && (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          Good to know first:{' '}
          {prerequisites.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ', '}
              <Link to={`/roadmap/${p.id}`} className="font-medium text-brand-700 hover:underline dark:text-brand-400">
                {p.title}
              </Link>
            </span>
          ))}
        </p>
      )}

      <div className="mt-6 flex gap-3 rounded-2xl bg-brand-50 p-4 dark:bg-brand-950/60">
        <Lightbulb size={20} className="mt-0.5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
        <p className="text-sm text-brand-900 dark:text-brand-100">
          <span className="font-semibold">Why it matters: </span>
          {topic.why}
        </p>
      </div>

      {topic.starter && (
        <div className="mt-3 flex gap-3 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          <Sprout size={20} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
          <p>
            This is a <strong>starter lesson</strong>: a short introduction to get you going. Use the resources
            below to go deeper. You can grow this lesson yourself by editing{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">src/content/lessons/{topic.id}.md</code>.
          </p>
        </div>
      )}

      <div className="mt-8">
        {lesson ? <LessonContent markdown={lesson} /> : <p>This lesson hasn't been written yet.</p>}
      </div>

      {quiz && (
        <div className="mt-10">
          {/* key: a different topic gets a brand-new quiz with fresh answers. */}
          <Quiz key={topic.id} topicId={topic.id} quiz={quiz} />
        </div>
      )}

      <section className="mt-10" aria-labelledby="resources-heading">
        <h2 id="resources-heading" className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          Free resources to go deeper
        </h2>
        <ResourceList resources={topic.resources} />
      </section>

      <nav aria-label="Previous and next topic" className="mt-10 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2 dark:border-slate-800">
        {previous ? (
          <Link to={`/roadmap/${previous.id}`} className="group rounded-xl border border-slate-200 p-4 hover:border-brand-300 dark:border-slate-800 dark:hover:border-brand-700">
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <ChevronLeft size={14} aria-hidden="true" /> Previous
            </span>
            <span className="mt-1 block font-medium text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
              {previous.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/roadmap/${next.id}`} className="group rounded-xl border border-slate-200 p-4 text-right hover:border-brand-300 dark:border-slate-800 dark:hover:border-brand-700">
            <span className="flex items-center justify-end gap-1 text-xs text-slate-500 dark:text-slate-400">
              Next <ChevronRight size={14} aria-hidden="true" />
            </span>
            <span className="mt-1 block font-medium text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
              {next.title}
            </span>
          </Link>
        )}
      </nav>
    </article>
  )
}
