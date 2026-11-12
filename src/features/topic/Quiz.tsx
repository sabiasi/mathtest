import { CircleCheck, CircleX, RotateCcw, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { repo } from '../../data'
import type { Quiz as QuizData } from '../../data/content'
import type { QuizAttempt } from '../../data/types'
import { useProgress } from '../../hooks/ProgressContext'

interface QuizProps {
  topicId: string
  quiz: QuizData
}

/**
 * The "check yourself" quiz. Pick an answer for each question, then press
 * "Check my answers". Every question explains its answer, right or wrong,
 * because the point is learning, not just scoring.
 */
export function Quiz({ topicId, quiz }: QuizProps) {
  const { statusOf, setStatus } = useProgress()
  // One slot per question: the index of the chosen option, or null if none yet.
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.questions.map(() => null))
  const [checked, setChecked] = useState(false)
  const [history, setHistory] = useState<QuizAttempt[]>([])

  // Load your earlier attempts at this quiz.
  useEffect(() => {
    // "cancelled" avoids setting state if you leave the page before loading finishes.
    let cancelled = false
    void repo.getQuizAttempts(topicId).then((attempts) => {
      if (!cancelled) setHistory(attempts)
    })
    return () => {
      cancelled = true
    }
  }, [topicId])

  const total = quiz.questions.length
  const score = answers.filter((answer, i) => answer === quiz.questions[i].answer).length
  const allAnswered = answers.every((answer) => answer !== null)
  const best = history.reduce((max, attempt) => Math.max(max, attempt.score), 0)

  function choose(questionIndex: number, optionIndex: number) {
    if (checked) return // answers are locked once checked
    // Make a NEW array instead of changing the old one, so React sees the change.
    setAnswers((previous) => previous.map((a, i) => (i === questionIndex ? optionIndex : a)))
  }

  async function check() {
    setChecked(true)
    const attempt = await repo.addQuizAttempt({ topicId, score, total })
    setHistory((previous) => [...previous, attempt])
  }

  function tryAgain() {
    setAnswers(quiz.questions.map(() => null))
    setChecked(false)
  }

  return (
    <section aria-labelledby="quiz-heading" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="quiz-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
          Check yourself
        </h2>
        {history.length > 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Best score: {best}/{total} · {history.length} {history.length === 1 ? 'try' : 'tries'}
          </p>
        )}
      </div>

      <ol className="space-y-6">
        {quiz.questions.map((question, qIndex) => {
          const chosen = answers[qIndex]
          const correct = chosen === question.answer
          return (
            <li key={qIndex}>
              <fieldset>
                <legend className="font-medium text-slate-900 dark:text-white">
                  {qIndex + 1}. {question.question}
                </legend>
                {question.code && (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-sm text-slate-100 dark:bg-slate-950">
                    <code>{question.code}</code>
                  </pre>
                )}
                <div className="mt-3 grid gap-2">
                  {question.options.map((option, oIndex) => {
                    const isChosen = chosen === oIndex
                    const isAnswer = question.answer === oIndex
                    // After checking: green for the right answer, red for a wrong pick.
                    let style = isChosen
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/60'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                    if (checked && isAnswer) style = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                    else if (checked && isChosen) style = 'border-rose-500 bg-rose-50 dark:bg-rose-500/10'

                    return (
                      <label
                        key={oIndex}
                        className={`flex items-start gap-3 rounded-xl border-2 px-3 py-2.5 text-sm transition-colors ${style} ${
                          checked ? 'cursor-default' : 'cursor-pointer'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`${topicId}-q${qIndex}`}
                          checked={isChosen}
                          onChange={() => choose(qIndex, oIndex)}
                          disabled={checked}
                          className="mt-0.5 accent-brand-600"
                        />
                        <span className="flex-1 text-slate-800 dark:text-slate-200">{option}</span>
                        {checked && isAnswer && <CircleCheck size={18} className="shrink-0 text-emerald-600" aria-label="Correct answer" />}
                        {checked && isChosen && !isAnswer && <CircleX size={18} className="shrink-0 text-rose-600" aria-label="Your answer (incorrect)" />}
                      </label>
                    )
                  })}
                </div>
                {checked && (
                  <p
                    className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                      correct
                        ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200'
                        : 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200'
                    }`}
                  >
                    <span className="font-semibold">{correct ? 'Correct! ' : 'Not quite. '}</span>
                    {question.explanation}
                  </p>
                )}
              </fieldset>
            </li>
          )
        })}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
        {!checked ? (
          <>
            <button
              type="button"
              onClick={() => void check()}
              disabled={!allAnswered}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Check my answers
            </button>
            {!allAnswered && (
              <span className="text-sm text-slate-500 dark:text-slate-400">Answer every question to check.</span>
            )}
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              {score === total && <Trophy size={18} className="text-amber-500" aria-hidden="true" />}
              {score} / {total} correct
              {score === total ? '. Perfect!' : score >= total / 2 ? '. Nice work!' : '. Read the explanations, then try again.'}
            </p>
            <button
              type="button"
              onClick={tryAgain}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw size={15} aria-hidden="true" /> Try again
            </button>
            {score === total && statusOf(topicId) !== 'done' && (
              <button
                type="button"
                onClick={() => void setStatus(topicId, 'done')}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Mark this topic as done ✓
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
