import { Link } from 'react-router'

/** The DevPath name + mark. Clicking it always takes you home. */
export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
      <span className="grid size-7 place-items-center rounded-lg bg-brand-600 text-sm text-white">
        {'</>'}
      </span>
      DevPath
    </Link>
  )
}
