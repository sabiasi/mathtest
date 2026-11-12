import type { TopicStatus } from '../../data/types'

/**
 * How each status looks, in one place. The map, the list, the badges and the
 * picker all read from here, so the colors always match.
 * (Tailwind finds these class names by scanning this file, so they must be
 * written out in full, never built from pieces like `bg-${color}-500`.)
 */
export const statusOrder: TopicStatus[] = ['not-started', 'learning', 'done']

export const statusInfo: Record<
  TopicStatus,
  { label: string; dot: string; badge: string; card: string }
> = {
  'not-started': {
    label: 'Not started',
    dot: 'bg-slate-300 dark:bg-slate-600',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    card: 'border-slate-200 dark:border-slate-700',
  },
  learning: {
    label: 'Learning',
    dot: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    card: 'border-amber-300 dark:border-amber-500/60',
  },
  done: {
    label: 'Done',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    card: 'border-emerald-300 dark:border-emerald-500/60',
  },
}
