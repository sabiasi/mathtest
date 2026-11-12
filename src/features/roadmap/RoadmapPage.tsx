import { ReactFlowProvider } from '@xyflow/react'
import { List, Workflow } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { ProgressBar } from '../../components/ProgressBar'
import { allTopics, stages } from '../../data/content'
import { useProgress } from '../../hooks/ProgressContext'
import { progressStats } from './progressStats'
import { RoadmapList } from './RoadmapList'
import { RoadmapMap } from './RoadmapMap'
import { TopicPanel } from './TopicPanel'

type View = 'map' | 'list'

/** Phones get the list by default; it's easier to use on a small screen. */
function defaultView(): View {
  return window.matchMedia('(min-width: 768px)').matches ? 'map' : 'list'
}

export function RoadmapPage() {
  const { statusOf } = useProgress()
  const stats = progressStats(allTopics, statusOf)

  // The chosen view lives in the URL (?view=list), not just in memory.
  // That way the Back button and bookmarks remember it.
  const [searchParams, setSearchParams] = useSearchParams()
  const view: View = searchParams.get('view') === 'list' ? 'list' : searchParams.get('view') === 'map' ? 'map' : defaultView()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const viewButton = (value: View, label: string, Icon: typeof List) => (
    <button
      type="button"
      role="radio"
      aria-checked={view === value}
      onClick={() => setSearchParams({ view: value }, { replace: true })}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        view === value
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      <Icon size={15} aria-hidden="true" /> {label}
    </button>
  )

  return (
    <>
      <PageHeader
        title="Your roadmap"
        intro={`The whole journey in ${stages.length} stages, from how a computer works to your first job interview. Go roughly in order, but feel free to explore.`}
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm flex-1">
          <p className="mb-1.5 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white">{stats.done}</span> of {stats.total}{' '}
            topics done · about {stats.hoursLeft} hours to go
          </p>
          <ProgressBar done={stats.done} learning={stats.learning} total={stats.total} label="Overall progress" />
        </div>
        <div role="radiogroup" aria-label="View" className="inline-flex self-start rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {viewButton('map', 'Map', Workflow)}
          {viewButton('list', 'List', List)}
        </div>
      </div>

      {view === 'map' ? (
        // The provider lets the stage-jump dropdown control the map's camera.
        <ReactFlowProvider>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <RoadmapMap selectedId={selectedId} onSelect={setSelectedId} />
            <TopicPanel topicId={selectedId} onSelect={setSelectedId} />
          </div>
        </ReactFlowProvider>
      ) : (
        <RoadmapList />
      )}
    </>
  )
}
