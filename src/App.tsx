import type { ReactElement } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ComingSoon } from './components/ComingSoon'
import { NotFoundPage } from './components/NotFoundPage'
import { HomePage } from './features/home/HomePage'
import { AppLayout } from './layout/AppLayout'
import { allNavItems } from './layout/navigation'

/**
 * Pages that are built so far, by their id from navigation.ts.
 * Any menu item NOT listed here shows the "Coming in Phase N" placeholder.
 * Each phase adds a line or two here, e.g.  roadmap: <RoadmapPage />,
 */
const builtPages: Record<string, ReactElement> = {
  home: <HomePage />,
}

/**
 * The router: it looks at the URL and decides which page to show.
 * All pages sit inside <AppLayout>, so they share the sidebar.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {allNavItems.map((item) => (
            <Route
              key={item.id}
              path={item.path}
              element={builtPages[item.id] ?? <ComingSoon item={item} />}
            />
          ))}
          {/* "*" matches any URL that nothing above matched. */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
