import { X } from 'lucide-react'
import { NavLink } from 'react-router'
import { ThemeToggle } from '../components/ThemeToggle'
import { Logo } from '../components/Logo'
import { BUILT_UP_TO_PHASE, navGroups } from './navigation'

interface SidebarProps {
  /** Only matters on small screens, where the sidebar slides in and out. */
  open: boolean
  onClose: () => void
}

/**
 * The menu on the left. On wide screens it's always visible. On phones it
 * hides off-screen and slides in when you tap the menu button.
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-label="Main menu"
    >
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="px-3 pb-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const comingLater = item.phase > BUILT_UP_TO_PHASE
                return (
                  <li key={item.id}>
                    {/* NavLink is a link that knows whether its page is the
                        current one, so we can highlight it. "end" stops "/"
                        from matching every page. */}
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-brand-50 font-medium text-brand-800 dark:bg-brand-950 dark:text-brand-200'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                        }`
                      }
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span className="flex-1">{item.label}</span>
                      {comingLater && (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Phase {item.phase}
                        </span>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <ThemeToggle />
      </div>
    </aside>
  )
}
