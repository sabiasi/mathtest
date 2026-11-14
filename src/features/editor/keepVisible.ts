/**
 * Scrolling rules of the editor (the fix for "the page jumps"):
 *
 *  - The sticky top bar and the toolbar hanging under it cover the top of
 *    the window. Their total height is kept in the CSS variable --editor-top
 *    (set by TestEditor); globals.css gives focusable things in the editor a
 *    matching `scroll-margin-top`, EXCEPT things inside the bar itself.
 *  - The page is scrolled only when what the teacher is working on is really
 *    hidden, and only by the smallest amount that shows it again.
 */

const GAP = 12; // px of air between the bar and the thing we reveal

/** The height (px) covered at the top of the window by the editor's bar + toolbar. */
export function coveredTop(): number {
  if (typeof window === "undefined") return 0;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--editor-top")) || 0;
}

/**
 * How far the window must scroll (px, + = down) so that the strip from `top`
 * to `bottom` (window coordinates) is visible; 0 when it already is.
 */
export function scrollNeeded(top: number, bottom: number, covered: number, windowHeight: number): number {
  const limitTop = covered + GAP;
  const limitBottom = windowHeight - GAP;
  if (top < limitTop) return Math.round(top - limitTop); // hidden under the bar: scroll up
  if (bottom > limitBottom) return Math.round(Math.min(bottom - limitBottom, top - limitTop)); // below the window: scroll down, but never push the top under the bar
  return 0;
}

/** Scrolls the window just enough to show this strip of the window (no animation: it must feel instant). */
export function reveal(top: number, bottom: number) {
  const by = scrollNeeded(top, bottom, coveredTop(), window.innerHeight);
  if (by !== 0) window.scrollBy({ top: by, behavior: "instant" });
}

/** Makes sure the element with the keyboard focus isn't hidden under the toolbar (e.g. after it opened or grew). */
export function revealFocused() {
  const active = document.activeElement as HTMLElement | null;
  // Things inside the bar are always visible (and can't be scrolled anyway).
  if (!active || active === document.body || active.closest("[data-editor-bar]")) return;
  const rect = active.getBoundingClientRect();
  // Only the top matters here: a tall box may reach below the window, that's fine.
  if (rect.top < coveredTop() + GAP) reveal(rect.top, rect.top);
}
