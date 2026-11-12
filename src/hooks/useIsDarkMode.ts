import { useSyncExternalStore } from 'react'

/*
  Is dark mode on right now? The truth lives OUTSIDE React: it's the "dark"
  class on <html>, set by useTheme. useSyncExternalStore is React's tool for
  reading outside data like this: `subscribe` says how to listen for changes,
  `getSnapshot` says how to read the current value.
*/

function subscribe(onChange: () => void) {
  // A MutationObserver calls us whenever <html>'s class attribute changes.
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function getSnapshot() {
  return document.documentElement.classList.contains('dark')
}

export function useIsDarkMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
