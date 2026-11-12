import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from '../hooks/useTheme'

// The three choices, as data. The buttons below are drawn from this list
// instead of copy-pasting three nearly identical <button>s.
const options: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

/** Three small buttons: Light / System / Dark. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
    >
      {options.map(({ value, label, Icon }) => {
        const selected = preference === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
              selected
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
