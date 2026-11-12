import { lazy, type ReactElement } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ComingSoon } from './components/ComingSoon'
import { NotFoundPage } from './components/NotFoundPage'
import { HomePage } from './features/home/HomePage'
import { ProgressProvider } from './hooks/ProgressProvider'
import { AppLayout } from './layout/AppLayout'
import { allNavItems } from './layout/navigation'

/*
  "Code splitting": lazy() turns each page into its own JavaScript file that
  the browser downloads only the first time you open that page. Without it,
  every visitor would download the map library, the Markdown renderer and
  every lesson just to see the Home page. (The <Suspense> in AppLayout shows
  "Loading…" during that first download.)
  The .then(...) part is needed because lazy() expects a "default" export,
  and our pages use named exports.
*/
const RoadmapPage = lazy(() =>
  import('./features/roadmap/RoadmapPage').then((m) => ({ default: m.RoadmapPage })),
)
const TopicPage = lazy(() =>
  import('./features/topic/TopicPage').then((m) => ({ default: m.TopicPage })),
)
const GlossaryPage = lazy(() =>
  import('./features/glossary/GlossaryPage').then((m) => ({ default: m.GlossaryPage })),
)

/**
 * Pages that are built so far, by their id from navigation.ts.
 * Any menu item NOT listed here shows the "Coming in Phase N" placeholder.
 */
const builtPages: Record<string, ReactElement> = {
  home: <HomePage />,
  roadmap: <RoadmapPage />,
  glossary: <GlossaryPage />,
}

/**
 * The router: it looks at the URL and decides which page to show.
 * All pages sit inside <AppLayout>, so they share the sidebar, and inside
 * <ProgressProvider>, so they can all read and change your progress.
 */
export default function App() {
  return (
    <ProgressProvider>
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
            {/* ":topicId" is a URL parameter: /roadmap/variables → topicId = "variables" */}
            <Route path="/roadmap/:topicId" element={<TopicPage />} />
            {/* "*" matches any URL that nothing above matched. */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProgressProvider>
  )
}
