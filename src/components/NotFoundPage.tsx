import { Link } from 'react-router'
import { PageHeader } from './PageHeader'

/**
 * Shown when the URL doesn't match any page. "404" is the HTTP status code
 * that means "not found"; you'll meet it in the "How the web works" stage.
 */
export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found (404)" intro="There's no page at this address." />
      <Link to="/" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
        ← Back to Home
      </Link>
    </>
  )
}
