"use client";

import {
  ArrowLeft,
  CloudAlert,
  CloudCheck,
  ListChecks,
  ListPlus,
  LoaderCircle,
  NotebookPen,
  Printer,
  TextCursorInput,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MathEditingProvider, useMathEditing, useMathLiveReady } from "@/features/math/MathEditingContext";
import { MathToolbar } from "@/features/math/MathToolbar";
import { useT } from "@/i18n/language";
import { createQuestion, duplicateQuestion, formatPoints, totalPoints } from "@/lib/questions";
import { isRichTextEmpty } from "@/lib/richText";
import { useSaveState } from "@/lib/storage/useTests";
import type { Question, QuestionType, Test } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
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
  const confirm = useConfirm();
  const [test, setTest] = useState(initialTest);
  const [dirty, setDirty] = useState(false); // true = has unsaved changes
  const [focusId, setFocusId] = useState<string | null>(null);
  const mathReady = useMathLiveReady();

  // Tell the browser how tall the sticky bar is, so when it scrolls something
  // into view (e.g. the box you clicked) it doesn't end up hidden underneath.
  const stickyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = stickyRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => (root.style.scrollPaddingTop = `${bar.offsetHeight + 16}px`));
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.scrollPaddingTop = "";
    };
  }, []);

  const markSaved = useCallback(() => setDirty(false), []);
  useAutosave(test, dirty, markSaved);
  // "dirty" = typed but not handed to the repository yet; cloudState = on its way to the cloud.
  const cloudState = useSaveState(test.id);
  const saveState = cloudState === "error" ? "error" : dirty || cloudState === "saving" ? "saving" : "saved";

  // Tell the teacher once when the cloud can't be reached (the indicator keeps showing it).
  const warned = useRef(false);
  useEffect(() => {
    if (saveState === "error" && !warned.current) {
      warned.current = true;
      toast.error(t("toast.saveError"));
    }
    if (saveState === "saved") warned.current = false;
  }, [saveState, t]);

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

  async function remove(question: Question, number: number) {
    // Only ask when there is something to lose.
    const hasContent = !isRichTextEmpty(question.text) || question.images.length > 0;
    if (hasContent) {
      const ok = await confirm({
        title: t("questions.delete"),
        message: t("questions.deleteConfirm", { number }),
        confirmLabel: t("dialog.delete"),
        danger: true,
      });
      if (!ok) return;
    }
    updateQuestions((qs) => qs.filter((q) => q.id !== question.id));
    // A safety net: put it back exactly where it was.
    toast(t("toast.questionDeleted", { number }), {
      action: {
        label: t("toast.undo"),
        onClick: () =>
          updateQuestions((qs) =>
            qs.some((q) => q.id === question.id) ? qs : [...qs.slice(0, number - 1), question, ...qs.slice(number - 1)],
          ),
      },
    });
  }

  const total = formatPoints(totalPoints(test.questions));

  return (
    <MathEditingProvider>
      <div className="pb-24" data-editor-ready={mathReady ? "true" : "false"}>
        {/* Sticky bar: stays at the top while scrolling. */}
        <div ref={stickyRef} className="sticky top-0 z-20 border-b bg-card/85 shadow-sm backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
            <Link
              href="/tests"
              // Leaving saves right away (see useAutosave); say so.
              onClick={() => saveState !== "error" && toast.success(t("toast.saved"))}
              className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {/* On phones only the arrow shows; screen readers still hear the text. */}
              <span className="max-sm:sr-only">{t("editor.back")}</span>
            </Link>
            <div className="flex flex-1 justify-end">
              <Link href={`/print/${test.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Printer className="size-4" aria-hidden="true" />
                <span className="max-sm:sr-only">{t("editor.printPreview")}</span>
              </Link>
            </div>
            <span
              className={cn("flex items-center gap-1.5 text-sm", saveState === "error" ? "text-destructive-text" : "text-muted-foreground")}
              aria-live="polite"
              data-save-state={saveState}
            >
              {saveState === "error" ? (
                <>
                  <CloudAlert className="size-4" aria-hidden="true" />
                  <span className="max-sm:sr-only">{t("editor.saveError")}</span>
                </>
              ) : saveState === "saving" ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  <span className="max-sm:sr-only">{t("editor.saving")}</span>
                </>
              ) : (
                <>
                  <CloudCheck className="size-4 text-success" aria-hidden="true" />
                  <span className="max-sm:sr-only">{t("editor.saved")}</span>
                </>
              )}
            </span>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold whitespace-nowrap text-brand tabular-nums">
              {t("editor.total", { points: total })}
            </span>
          </div>
          {mathReady && <ToolbarWhenEditing />}
        </div>

        {!mathReady ? (
          <EditorSkeleton label={t("editor.loading")} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-8 px-4 pt-8 sm:px-6">
            <TestHeaderForm test={test} onChange={update} />

            <section>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">{t("questions.heading")}</h2>
                <span className="text-sm text-muted-foreground">{t("editor.total", { points: total })}</span>
              </div>

              {test.questions.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border-2 border-dashed bg-card/60 px-6 py-10 text-center">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-brand">
                    <ListPlus className="size-6" aria-hidden="true" />
                  </span>
                  <p className="mt-3 font-semibold text-foreground">{t("questions.emptyTitle")}</p>
                  <p className="mt-1 max-w-md text-[15px] text-muted-foreground">{t("questions.empty")}</p>
                </div>
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

              <div className="mt-2 rounded-2xl border bg-card p-4 shadow-sm">
                <p className="mb-3 text-sm font-medium text-soft-foreground">{t("questions.add")}:</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ADD_BUTTONS.map(({ type, Icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addQuestion(type)}
                      className="group flex items-center gap-3 rounded-xl border px-4 py-3 text-left font-medium text-foreground transition-[background-color,border-color,box-shadow,translate,scale] duration-150 hover:border-primary-soft-border hover:bg-primary-soft/60 hover:shadow-sm motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
                    >
                      <span className="rounded-lg bg-primary-soft p-1.5 text-brand transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block">{t(`type.${type}`)}</span>
                        <span className="block text-sm font-normal text-muted-foreground">{t(`typeHint.${type}`)}</span>
                      </span>
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

/** Grey shapes in the layout of the editor, shown while it loads. */
export function EditorSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pt-8 sm:px-6" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-11 w-full" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex gap-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="ml-auto h-8 w-20" />
          </div>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** The math toolbar, shown only while a question or answer box is being edited. */
function ToolbarWhenEditing() {
  const { activeEditor } = useMathEditing();
  // AnimatePresence lets the toolbar slide closed instead of vanishing.
  return <AnimatePresence initial={false}>{activeEditor && <MathToolbar key="toolbar" />}</AnimatePresence>;
}
