interface ProgressBarProps {
  done: number
  learning?: number
  total: number
  /** Read out by screen readers, e.g. "Foundations progress". */
  label: string
}

/** A thin bar: green for done, amber for learning, grey for the rest. */
export function ProgressBar({ done, learning = 0, total, label }: ProgressBarProps) {
  // Guard against dividing by zero if a stage ever has no topics.
  const percent = (count: number) => (total === 0 ? 0 : (count / total) * 100)

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
    >
      <div className="bg-emerald-500 transition-all" style={{ width: `${percent(done)}%` }} />
      <div className="bg-amber-400 transition-all" style={{ width: `${percent(learning)}%` }} />
    </div>
  )
}
