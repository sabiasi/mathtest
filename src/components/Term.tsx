import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { glossary } from '../data/content'

interface TermProps {
  /** The glossary id, e.g. "cpu" (see src/content/glossary.json). */
  id: string
  children: ReactNode
}

const TOOLTIP_WIDTH = 256 // px
const EDGE_MARGIN = 8 // px: keep at least this much space from the screen edges

/**
 * A word with a dotted underline. Hover over it, or tap/Tab to it, to see its
 * definition from the glossary. Lessons create these with Markdown links like
 * [CPU](term:cpu).
 *
 * Why the measuring? A tooltip centered on a word near the screen's edge would
 * stick out past it (on phones, that made the whole page scroll sideways).
 * So when it opens, we measure where the word is with getBoundingClientRect()
 * and slide the tooltip back inside the screen, or show it below the word if
 * there's no room above.
 */
export function Term({ id, children }: TermProps) {
  const entry = glossary[id]
  const wordRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState<CSSProperties | null>(null) // null = closed

  function open() {
    const word = wordRef.current
    if (!word) return
    const rect = word.getBoundingClientRect()
    const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - 2 * EDGE_MARGIN)
    // Center on the word, then clamp between the left and right edges.
    const centered = rect.left + rect.width / 2 - width / 2
    const left = Math.min(Math.max(centered, EDGE_MARGIN), window.innerWidth - width - EDGE_MARGIN)
    const roomAbove = rect.top > 140
    setPosition({
      left,
      width,
      ...(roomAbove
        ? { top: rect.top - 8, transform: 'translateY(-100%)' } // above the word
        : { top: rect.bottom + 8 }), // below the word
    })
  }

  const close = () => setPosition(null)

  // While open, close on scroll (the tooltip would drift away from its word)
  // and on the Escape key.
  useEffect(() => {
    if (!position) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close()
    window.addEventListener('scroll', close, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [position])

  // If an id is wrong, show the plain word instead of crashing the lesson.
  // (The content test catches wrong ids anyway.)
  if (!entry) return <>{children}</>

  return (
    <>
      <button
        ref={wordRef}
        type="button"
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        aria-describedby={position ? `term-${id}` : undefined}
        className="cursor-help border-b border-dotted border-brand-600 font-[inherit] text-[inherit] dark:border-brand-400"
      >
        {children}
      </button>
      {position && (
        // position: fixed = placed relative to the screen, not the text,
        // which is what makes the edge-clamping above work.
        <span
          id={`term-${id}`}
          role="tooltip"
          style={{ position: 'fixed', ...position }}
          className="pointer-events-none z-50 rounded-lg bg-slate-900 p-3 text-left text-sm leading-snug font-normal text-slate-100 not-italic shadow-lg dark:bg-slate-700"
        >
          <span className="block font-semibold text-white">{entry.term}</span>
          {entry.definition}
        </span>
      )}
    </>
  )
}
