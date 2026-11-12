import { Download, RotateCcw, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { repo } from '../../data'
import { useProgress } from '../../hooks/ProgressContext'

/**
 * Export / import / reset your saved data. Because v1 keeps everything in this
 * browser only, a backup file is your safety net (and how you'd move to
 * another computer).
 */
export function DataBackup() {
  const { reload } = useProgress()
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function exportBackup() {
    const json = await repo.exportData()
    // Make a temporary file in memory (a "Blob"), then click a hidden download link to it.
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `devpath-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url) // free the memory
    setMessage({ kind: 'ok', text: 'Backup downloaded. Keep it somewhere safe.' })
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // so choosing the same file again still triggers a change
    if (!file) return
    try {
      await repo.importData(await file.text())
      await reload()
      setMessage({ kind: 'ok', text: `Imported ${file.name}. Your progress is restored.` })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    }
  }

  async function reset() {
    // window.confirm shows a simple "OK / Cancel" box. Deleting deserves a second chance.
    if (!window.confirm('Delete ALL your DevPath progress and quiz results? This cannot be undone.')) return
    await repo.clearAll()
    await reload()
    setMessage({ kind: 'ok', text: 'All progress was deleted. A fresh start!' })
  }

  const button =
    'flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-semibold text-slate-900 dark:text-white">Your data</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Your progress is saved in this browser's <strong>localStorage</strong>, on this computer only. Clearing your
        browser data would erase it, so download a backup now and then.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void exportBackup()} className={button}>
          <Download size={15} aria-hidden="true" /> Export backup
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={button}>
          <Upload size={15} aria-hidden="true" /> Import backup
        </button>
        <button
          type="button"
          onClick={() => void reset()}
          className={`${button} text-rose-700 dark:text-rose-400`}
        >
          <RotateCcw size={15} aria-hidden="true" /> Reset everything
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" onChange={(e) => void importBackup(e)} className="hidden" />
      </div>
      {message && (
        <p
          role="status"
          className={`mt-3 text-sm ${message.kind === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}
        >
          {message.text}
        </p>
      )}
    </section>
  )
}
