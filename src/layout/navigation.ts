import {
  Blocks,
  BookOpen,
  BriefcaseBusiness,
  ChartColumn,
  Code,
  House,
  Lightbulb,
  MapIcon,
  MessagesSquare,
  NotebookPen,
  ScanSearch,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

/**
 * Every page in DevPath, described in ONE place.
 *
 * Why one list? The sidebar menu and the router (which decides which page to
 * show for a URL) both read from it. If each kept its own copy, they could
 * drift apart: a menu link pointing to a page that doesn't exist. Engineers call
 * this keeping a "single source of truth".
 */
export interface NavItem {
  /** Short unique name, used to look up the page component in App.tsx. */
  id: string
  /** The URL path, e.g. "/roadmap". */
  path: string
  label: string
  icon: LucideIcon
  /** Which build phase delivers this page (see the plan in README.md). */
  phase: number
  /** One friendly sentence about what the page is for. */
  summary: string
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

/**
 * The highest phase that is finished. Menu items from later phases show a small
 * "Phase N" badge so you can see what's coming. Bump this after each phase.
 */
export const BUILT_UP_TO_PHASE = 1

export const navGroups: NavGroup[] = [
  {
    title: 'Start',
    items: [
      {
        id: 'home',
        path: '/',
        label: 'Home',
        icon: House,
        phase: 0,
        summary: 'Your starting point: what DevPath is and how to use it.',
      },
    ],
  },
  {
    title: 'Learn',
    items: [
      {
        id: 'roadmap',
        path: '/roadmap',
        label: 'Roadmap',
        icon: MapIcon,
        phase: 1,
        summary:
          'A clickable map of the whole journey, from how computers work to your first job.',
      },
      {
        id: 'glossary',
        path: '/glossary',
        label: 'Glossary',
        icon: BookOpen,
        phase: 1,
        summary: 'Every technical term in DevPath, explained in plain words.',
      },
      {
        id: 'visualizers',
        path: '/visualizers',
        label: 'Visualizers',
        icon: Sparkles,
        phase: 2,
        summary:
          'Small animations that show hard ideas: memory, Git, URLs, sorting and the call stack.',
      },
      {
        id: 'lab',
        path: '/lab',
        label: 'Code Lab',
        icon: Code,
        phase: 2,
        summary:
          'Write and run Python and JavaScript right in the browser, and compare them side by side.',
      },
    ],
  },
  {
    title: 'Grow',
    items: [
      {
        id: 'journal',
        path: '/journal',
        label: 'Journal',
        icon: NotebookPen,
        phase: 3,
        summary:
          'Log each study session: what you did, how long, what was hard, what you learned.',
      },
      {
        id: 'analytics',
        path: '/analytics',
        label: 'Analytics',
        icon: ChartColumn,
        phase: 3,
        summary:
          'Charts of your hours, streaks and weak spots, plus a suggested next step.',
      },
      {
        id: 'reflection',
        path: '/reflection',
        label: 'Code Reflection',
        icon: ScanSearch,
        phase: 3,
        summary:
          'Paste your code and get friendly hints about speed, naming, structure and edge cases.',
      },
    ],
  },
  {
    title: 'Get job-ready',
    items: [
      {
        id: 'projects',
        path: '/projects',
        label: 'Project Ideas',
        icon: Lightbulb,
        phase: 4,
        summary:
          '20+ projects sorted by difficulty, each with milestones you can tick off.',
      },
      {
        id: 'interview',
        path: '/interview',
        label: 'Interview Prep',
        icon: MessagesSquare,
        phase: 4,
        summary:
          'Flashcards, small coding challenges with tests, and behavioral-question practice.',
      },
      {
        id: 'portfolio',
        path: '/portfolio',
        label: 'Portfolio',
        icon: BriefcaseBusiness,
        phase: 4,
        summary: 'Turn your finished projects into a simple page you can share.',
      },
    ],
  },
  {
    title: 'About',
    items: [
      {
        id: 'about',
        path: '/about',
        label: 'How DevPath is built',
        icon: Blocks,
        phase: 4,
        summary:
          "A tour of this app's own code, so DevPath itself becomes a project you can study.",
      },
    ],
  },
]

/** All items in one flat list, handy for the router. */
export const allNavItems: NavItem[] = navGroups.flatMap((group) => group.items)
