import {
  BookMarked,
  ExternalLink,
  FileText,
  GraduationCap,
  Laptop,
  Newspaper,
  Video,
  type LucideIcon,
} from 'lucide-react'
import type { Resource, ResourceKind } from '../../data/content'

const kinds: Record<ResourceKind, { label: string; Icon: LucideIcon }> = {
  docs: { label: 'Official docs', Icon: FileText },
  course: { label: 'Free course', Icon: GraduationCap },
  video: { label: 'Video', Icon: Video },
  interactive: { label: 'Interactive', Icon: Laptop },
  book: { label: 'Free book', Icon: BookMarked },
  article: { label: 'Article', Icon: Newspaper },
}

/** The hand-picked free resources for a topic. They open in a new tab. */
export function ResourceList({ resources }: { resources: Resource[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {resources.map((resource) => {
        const { label, Icon } = kinds[resource.kind]
        // new URL(...).hostname turns "https://docs.python.org/3/..." into "docs.python.org".
        const site = new URL(resource.url).hostname.replace(/^www\./, '')
        return (
          <li key={resource.url}>
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
            >
              <Icon size={20} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
                  {resource.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {label} · {site}
                </p>
              </div>
              <ExternalLink size={14} className="mt-1 shrink-0 text-slate-400" aria-label="(opens in a new tab)" />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
