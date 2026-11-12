import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router'
import { Logo } from '../components/Logo'
import { Sidebar } from './Sidebar'

/**
 * The frame around every page: the sidebar, a top bar on phones, and the main
 * content area. <Outlet /> is where React Router puts the current page.
 */
export function AppLayout() {
  // "State" is data a component remembers between redraws. Here it's just:
  // is the phone menu open right now?
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh">
      {/* Top bar, only on small screens (md:hidden hides it at 768px and up). */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <Logo />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Dark see-through backdrop behind the open phone menu; tap it to close. */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* md:pl-64 leaves room for the always-visible sidebar on wide screens. */}
      <main className="md:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
