import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  /** A short friendly intro under the title. Can contain links or bold text. */
  intro?: ReactNode
}

/** The same title style on every page, so the app feels consistent. */
export function PageHeader({ title, intro }: PageHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
        {title}
      </h1>
      {intro && (
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">{intro}</p>
      )}
    </header>
  )
}
