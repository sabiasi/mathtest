import { Search } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { glossary } from '../../data/content'

// Sort once, alphabetically, ignoring upper/lower case.
const entries = Object.entries(glossary).sort(([, a], [, b]) =>
  a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }),
)

/** Every technical term in DevPath, explained in plain words. */
export function GlossaryPage() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const visible = q
    ? entries.filter(([, e]) => e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q))
    : entries

  return (
    <>
      <PageHeader
        title="Glossary"
        intro="Every technical term used in DevPath, explained simply. In lessons, words with a dotted underline show these definitions when you hover over them or tap them."
      />

      <label className="relative mb-6 block max-w-md">
        <span className="sr-only">Search the glossary</span>
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search terms…"
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900"
        />
      </label>

      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
        {visible.length} {visible.length === 1 ? 'term' : 'terms'}
      </p>

      <dl className="grid gap-3 sm:grid-cols-2">
        {visible.map(([id, entry]) => (
          <div key={id} id={id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <dt className="font-semibold text-slate-900 dark:text-white">{entry.term}</dt>
            <dd className="mt-1 text-sm text-slate-600 dark:text-slate-400">{entry.definition}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}
