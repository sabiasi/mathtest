"use client";

import {
  ArrowLeft,
  CloudCheck,
  ListChecks,
  LoaderCircle,
  NotebookPen,
  Printer,
  TextCursorInput,
  ToggleRight,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { MathEditingProvider, useMathLiveReady } from "@/features/math/MathEditingContext";
import { MathToolbar } from "@/features/math/MathToolbar";
import { useT } from "@/i18n/language";
import { createQuestion, duplicateQuestion, formatPoints, totalPoints } from "@/lib/questions";
import { isRichTextEmpty } from "@/lib/richText";
import type { Question, QuestionType, Test } from "@/lib/storage/types";
import { QuestionList } from "./questions/QuestionList";
import { TestHeaderForm } from "./TestHeaderForm";
import { useAutosave } from "./useAutosave";

const ADD_BUTTONS: { type: QuestionType; Icon: typeof ListChecks }[] = [
  { type: "multiple-choice", Icon: ListChecks },
  { type: "true-false", Icon: ToggleRight },
  { type: "short-answer", Icon: TextCursorInput },
  { type: "open-answer", Icon: NotebookPen },
];

/**
 * The editor for one test. It keeps its own copy of the test in React
 * state (so typing is instant) and saves it in the background.
 */
export function TestEditor({ initialTest }: { initialTest: Test }) {
  const t = useT();
  const [test, setTest] = useState(initialTest);
  const [dirty, setDirty] = useState(false); // true = has unsaved changes
  const [focusId, setFocusId] = useState<string | null>(null);
  const mathReady = useMathLiveReady();

  const markSaved = useCallback(() => setDirty(false), []);
  useAutosave(test, dirty, markSaved);

  function update(changes: Partial<Test>) {
    setTest((prev) => ({ ...prev, ...changes }));
    setDirty(true);
  }

  function updateQuestions(change: (questions: Question[]) => Question[]) {
    setTest((prev) => ({ ...prev, questions: change(prev.questions) }));
    setDirty(true);
  }

  function addQuestion(type: QuestionType) {
    const question = createQuestion(type);
    updateQuestions((qs) => [...qs, question]);
    setFocusId(question.id);
  }

  function duplicate(question: Question) {
    const copy = duplicateQuestion(question);
    updateQuestions((qs) => {
      const index = qs.findIndex((q) => q.id === question.id);
      return [...qs.slice(0, index + 1), copy, ...qs.slice(index + 1)];
    });
    setFocusId(copy.id);
  }

  function remove(question: Question, number: number) {
    // Only ask when there is something to lose.
    const hasContent = !isRichTextEmpty(question.text);
    if (hasContent && !window.confirm(t("questions.deleteConfirm", { number }))) return;
    updateQuestions((qs) => qs.filter((q) => q.id !== question.id));
  }

  const total = formatPoints(totalPoints(test.questions));

  return (
    <MathEditingProvider>
      <div className="pb-24">
        {/* Sticky bar: stays at the top while scrolling. */}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded p-1 text-sm font-medium whitespace-nowrap text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {/* On phones only the arrow shows; screen readers still hear the text. */}
              <span className="max-sm:sr-only">{t("editor.back")}</span>
            </Link>
            <div className="flex flex-1 justify-end">
              <Link href={`/print/${test.id}`} className={buttonClasses("secondary", "py-1.5! text-sm!")}>
                <Printer className="size-4" aria-hidden="true" />
                <span className="max-sm:sr-only">{t("editor.printPreview")}</span>
              </Link>
            </div>
            <span className="flex items-center gap-1.5 text-sm text-slate-500" aria-live="polite">
              {dirty ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  <span className="max-sm:sr-only">{t("editor.saving")}</span>
                </>
              ) : (
                <>
                  <CloudCheck className="size-4 text-emerald-600" aria-hidden="true" />
                  <span className="max-sm:sr-only">{t("editor.saved")}</span>
                </>
              )}
            </span>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold whitespace-nowrap text-indigo-700">
              {t("editor.total", { points: total })}
            </span>
          </div>
          {mathReady && <MathToolbar />}
        </div>

        {!mathReady ? (
          <p className="py-16 text-center text-slate-500">{t("editor.loading")}</p>
        ) : (
          <div className="mx-auto max-w-3xl space-y-8 px-4 pt-8 sm:px-6">
            <TestHeaderForm test={test} onChange={update} />

            <section>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">{t("questions.heading")}</h2>
                <span className="text-sm text-slate-500">{t("editor.total", { points: total })}</span>
              </div>

              {test.questions.length === 0 ? (
                <p className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-600">
                  {t("questions.empty")}
                </p>
              ) : (
                <QuestionList
                  questions={test.questions}
                  labelStyle={test.labelStyle}
                  focusId={focusId}
                  onReorder={(questions) => update({ questions })}
                  onChange={(changed) =>
                    updateQuestions((qs) => qs.map((q) => (q.id === changed.id ? changed : q)))
                  }
                  // Changes that finish later (an image upload) are applied to the
                  // newest version of the question, so nothing typed meanwhile is lost.
                  onPatch={(id, patch) => updateQuestions((qs) => qs.map((q) => (q.id === id ? patch(q) : q)))}
                  onDuplicate={duplicate}
                  onDelete={remove}
                />
              )}

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-medium text-slate-700">{t("questions.add")}:</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ADD_BUTTONS.map(({ type, Icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addQuestion(type)}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left font-medium text-slate-800 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      <span className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      {t(`type.${type}`)}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </MathEditingProvider>
  );
}
