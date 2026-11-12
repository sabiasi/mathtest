import Markdown, { defaultUrlTransform, type Components } from 'react-markdown'
import { Link } from 'react-router'
import remarkGfm from 'remark-gfm'
import { Term } from '../../components/Term'

/*
  Turns a lesson's Markdown into React elements. We swap in our own
  components for a few Markdown pieces:
    [CPU](term:cpu)        → a <Term> with a glossary tooltip
    [Loops](/roadmap/loops) → an in-app <Link> (no full page reload)
    [MDN](https://…)        → a normal link that opens in a new tab
    tables                  → wrapped so they scroll sideways on phones
*/
const components: Components = {
  a({ href = '', children }) {
    if (href.startsWith('term:')) return <Term id={href.slice('term:'.length)}>{children}</Term>
    if (href.startsWith('/')) return <Link to={href}>{children}</Link>
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto">
        <table>{children}</table>
      </div>
    )
  },
}

/**
 * For safety, react-markdown removes links with unusual schemes (like
 * "javascript:", which could run code). Our "term:" links are safe, so we
 * let them through and hand everything else to the default safety check.
 */
function urlTransform(url: string): string {
  return url.startsWith('term:') ? url : defaultUrlTransform(url)
}

export function LessonContent({ markdown }: { markdown: string }) {
  return (
    // "prose" comes from Tailwind's typography plugin: nice default styles for
    // long text. The prose-* classes below fine-tune it.
    <div className="prose max-w-none prose-slate dark:prose-invert prose-headings:scroll-mt-20 prose-a:text-brand-700 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-th:text-left dark:prose-a:text-brand-400 dark:prose-code:bg-slate-800 dark:prose-pre:bg-slate-950 [&_pre_code]:bg-transparent [&_pre_code]:p-0 prose-blockquote:font-normal prose-blockquote:not-italic [&_blockquote_p]:before:content-none [&_blockquote_p]:after:content-none">
      <Markdown remarkPlugins={[remarkGfm]} components={components} urlTransform={urlTransform}>
        {markdown}
      </Markdown>
    </div>
  )
}
