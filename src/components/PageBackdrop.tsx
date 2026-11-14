import { cn } from "@/lib/utils";

/**
 * The soft light (and, on big "front" pages, the faint grid) behind the top
 * of a page — the same look as the landing page. Decoration only: it sits
 * behind the content, can't be clicked, and is never printed.
 *
 * Put it first inside a `relative` wrapper (with `overflow-x-clip`, so the
 * wide glow never causes sideways scrolling).
 */
export function PageBackdrop({ grid = false, className }: { grid?: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] overflow-hidden print:hidden", className)}>
      {grid && <div className="bg-grid absolute inset-0" />}
      <div className="absolute top-[-16rem] left-1/2 h-[30rem] w-[56rem] max-w-[140vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)] opacity-60 blur-2xl" />
    </div>
  );
}
