import { Hammer } from 'lucide-react'
import type { NavItem } from '../layout/navigation'
import { PageHeader } from './PageHeader'

/**
 * A placeholder for pages we haven't built yet. Having it means every menu link
 * works from day one, and you can see the whole shape of the app early.
 */
export function ComingSoon({ item }: { item: NavItem }) {
  return (
    <>
      <PageHeader title={item.label} intro={item.summary} />
      <div className="flex items-start gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <Hammer className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden="true" />
        <div>
          <p className="font-medium text-slate-900 dark:text-white">
            Coming in Phase {item.phase}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            This page is part of the plan but isn't built yet. We build DevPath one
            phase at a time, so each piece can be explained and tested before the
            next one starts.
          </p>
        </div>
      </div>
    </>
  )
}
