import { useEffect, useState } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

/**
 * Where the choice is saved. The same key is read by the small script in
 * index.html. If you rename it here, rename it there too.
 *
 * Why not save this through src/data like your learning progress? The theme is a
 * setting for THIS device (you might want dark on your laptop, light on your
 * phone), not part of your learning data, so it stays in the browser only.
 */
const STORAGE_KEY = 'devpath:theme'

const darkQuery = '(prefers-color-scheme: dark)'

function readSavedPreference(): ThemePreference {
  // localStorage can throw in some private-browsing modes, so we guard it
  // and fall back to "follow the system".
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // ignore: use the default below
  }
  return 'system'
}

/** Adds or removes the "dark" class on <html>; Tailwind's dark: styles key off it. */
function applyTheme(preference: ThemePreference) {
  const isDark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia(darkQuery).matches)
  document.documentElement.classList.toggle('dark', isDark)
}

/**
 * A "hook" is a reusable piece of component logic. Any component can call
 * useTheme() to read or change the theme.
 */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readSavedPreference)

  // useEffect runs code AFTER React draws the screen: a good place for
  // "side effects" like changing <html> or writing to storage.
  // It runs again whenever `preference` changes.
  useEffect(() => {
    applyTheme(preference)
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      // Not saved, but the theme still works for this visit.
    }

    // In "system" mode, follow the computer live if you switch it while
    // DevPath is open (e.g. macOS auto dark mode at sunset).
    if (preference !== 'system') return
    const media = window.matchMedia(darkQuery)
    const onSystemChange = () => applyTheme('system')
    media.addEventListener('change', onSystemChange)
    // The returned function is a "cleanup": React calls it before the effect
    // runs again, so we never pile up duplicate listeners.
    return () => media.removeEventListener('change', onSystemChange)
  }, [preference])

  return { preference, setPreference }
}
