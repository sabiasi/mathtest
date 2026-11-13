"use client";

import {
  ArrowLeft,
  CloudAlert,
  ArrowDownWideNarrow,
  BookOpenText,
  Feather,
  PenLine,
  Scale,
  CircleSlash,
  Grid2x2,
  Heading,
  Headphones,
  Images,
  MessagesSquare,
  Repeat,
  Search,
  Tags,
  Grid3x3,
  Network,
  Dna,
  TableProperties,
  Workflow,
  Triangle,
  ListTree,
  WholeWord,
  type LucideIcon,
  SpellCheck,
  Split,
  Table2,
  TextCursor,
  Underline,
  CloudCheck,
  ClipboardList,
  GitCompareArrows,
  GanttChart,
  HardDrive,
  MapPinned,
  Quote,
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
import { GuestBanner } from "@/components/GuestBanner";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MathEditingProvider, useMathEditing, useMathLiveReady } from "@/features/math/MathEditingContext";
import { useLanguage, useT } from "@/i18n/language";
import { createQuestion, duplicateQuestion, formatPoints, questionNumbers, totalPoints } from "@/lib/questions";
import { isRichTextEmpty } from "@/lib/richText";
import { useSaveState, useStorageKind } from "@/lib/storage/useTests";
import type { Question, QuestionType, Test } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { getToolkit } from "@/subjects/registry";
import type { SubjectToolkit } from "@/subjects/types";
import { QuestionList } from "./questions/QuestionList";
import { SubjectToolbar } from "./SubjectToolbar";
import { TestHeaderForm } from "./TestHeaderForm";
import { useAutosave } from "./useAutosave";

/** The icon on each "add a question" button. */
const TYPE_ICONS: Record<QuestionType, typeof ListChecks> = {
  "multiple-choice": ListChecks,
  "true-false": ToggleRight,
  "short-answer": TextCursorInput,
  "open-answer": NotebookPen,
  "given-find": ClipboardList,
  matching: GitCompareArrows,
  order: ArrowDownWideNarrow,
  timeline: GanttChart,
  source: Quote,
  map: MapPinned,
  passage: BookOpenText,
  poem: Feather,
  "fill-blank": TextCursor,
  "mark-words": Underline,
  "grammar-table": Table2,
  "find-mistake": SpellCheck,
  "sentence-analysis": Split,
  essay: PenLine,
  balance: Scale,
  section: Heading,
  listening: Headphones,
  speaking: MessagesSquare,
  transformation: Repeat,
  "word-formation": WholeWord,
  "picture-match": Images,
  "odd-one-out": CircleSlash,
  crossword: Grid2x2,
  "word-search": Search,
  "label-diagram": Tags,
  punnett: Grid3x3,
  pedigree: Network,
  sequence: Dna,
  "codon-table": TableProperties,
  "food-web": Workflow,
  pyramid: Triangle,
  "dichotomous-key": Split,
  taxonomy: ListTree,
};

/** One "add a question" button. */
function AddButton({ Icon, label, hint, onClick, dataType }: { Icon: LucideIcon; label: string; hint: string; onClick: () => void; dataType: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-add-type={dataType}
      className="group flex items-center gap-3 rounded-xl border px-4 py-3 text-left font-medium text-foreground transition-[background-color,border-color,box-shadow,translate,scale] duration-150 hover:border-primary-soft-border hover:bg-primary-soft/60 hover:shadow-sm motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
    >
      <span className="rounded-lg bg-primary-soft p-1.5 text-brand transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block">{label}</span>
        <span className="block text-sm font-normal text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

/**
 * The editor for one test. It keeps its own copy of the test in React
 * state (so typing is instant) and saves it in the background.
 */
export function TestEditor({ initialTest }: { initialTest: Test }) {
  const t = useT();
  const language = useLanguage();
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
  const onDevice = useStorageKind() === "device"; // a guest: saved in this browser only
  const saveState = cloudState === "error" ? "error" : dirty || cloudState === "saving" ? "saving" : "saved";

  // Tell the teacher once when the cloud can't be reached (the indicator keeps showing it).
  const warned = useRef(false);
  useEffect(() => {
    if (saveState === "error" && !warned.current) {
      warned.current = true;
      toast.error(t(onDevice ? "toast.saveErrorDevice" : "toast.saveError"));
    }
    if (saveState === "saved") warned.current = false;
  }, [saveState, onDevice, t]);

  function update(changes: Partial<Test>) {
    setTest((prev) => ({ ...prev, ...changes }));
    setDirty(true);
  }

  function updateQuestions(change: (questions: Question[]) => Question[]) {
    setTest((prev) => ({ ...prev, questions: change(prev.questions) }));
    setDirty(true);
  }

  function addQuestion(type: QuestionType, prepare?: (question: Question) => Question) {
    const fresh = createQuestion(type);
    const question = prepare ? prepare(fresh) : fresh;
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

  /** `position`: 1-based place in the list (for Undo). */
  async function remove(question: Question, position: number) {
    // The printed number (reading texts and poems have none).
    const number = questionNumbers(test.questions).get(question.id) ?? null;
    // Only ask when there is something to lose.
    const hasContent =
      !isRichTextEmpty(question.text) || question.images.length > 0 || ("body" in question && question.body.trim() !== "");
    if (hasContent) {
      const ok = await confirm({
        title: t("questions.delete"),
        message: number === null ? t("text.deleteConfirm") : t("questions.deleteConfirm", { number }),
        confirmLabel: t("dialog.delete"),
        danger: true,
      });
      if (!ok) return;
    }
    updateQuestions((qs) => qs.filter((q) => q.id !== question.id));
    // A safety net: put it back exactly where it was.
    toast(number === null ? t("text.deleted") : t("toast.questionDeleted", { number }), {
      action: {
        label: t("toast.undo"),
        onClick: () =>
          updateQuestions((qs) =>
            qs.some((q) => q.id === question.id) ? qs : [...qs.slice(0, position - 1), question, ...qs.slice(position - 1)],
          ),
      },
    });
  }

  const total = formatPoints(totalPoints(test.questions));
  // The subject's toolkit decides the toolbar and which question types are offered.
  const toolkit = getToolkit(test.subjectId);

  return (
    <MathEditingProvider>
      {/* lang: the browser spellchecks English tests in English. */}
      <div className="pb-24" data-editor-ready={mathReady ? "true" : "false"} lang={toolkit.contentLanguage} spellCheck>
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
                  {onDevice ? (
                    <HardDrive className="size-4 text-success" aria-hidden="true" />
                  ) : (
                    <CloudCheck className="size-4 text-success" aria-hidden="true" />
                  )}
                  <span className="max-sm:sr-only">{t(onDevice ? "editor.savedDevice" : "editor.saved")}</span>
                </>
              )}
            </span>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold whitespace-nowrap text-brand tabular-nums">
              {t("editor.total", { points: total })}
            </span>
          </div>
          {mathReady && <ToolbarWhenEditing toolkit={toolkit} />}
        </div>

        {!mathReady ? (
          <EditorSkeleton label={t("editor.loading")} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-8 px-4 pt-8 sm:px-6">
            <GuestBanner />
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
                  toolkit={toolkit}
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
                  {toolkit.questionTypes.map((type) => {
                    // A subject may name a type its own way ("Label the picture").
                    const own = toolkit.typeLabels?.[type];
                    return (
                      <AddButton
                        key={type}
                        Icon={TYPE_ICONS[type]}
                        label={own ? own[language] : t(`type.${type}`)}
                        hint={own ? (language === "en" ? own.hintEn : own.hintKa) : t(`typeHint.${type}`)}
                        onClick={() => addQuestion(type)}
                        dataType={type}
                      />
                    );
                  })}
                  {toolkit.presets?.map((preset) => (
                    <AddButton
                      key={preset.id}
                      Icon={TYPE_ICONS[preset.type]}
                      label={preset[language]}
                      hint={language === "en" ? preset.hintEn : preset.hintKa}
                      onClick={() => addQuestion(preset.type, preset.apply)}
                      dataType={preset.id}
                    />
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

/**
 * The subject's toolbar, shown only while a question or answer box is being
 * edited. A subject without formulas or toolbar tabs (Georgian, for now) has none.
 */
function ToolbarWhenEditing({ toolkit }: { toolkit: SubjectToolkit }) {
  const { activeEditor } = useMathEditing();
  const show = activeEditor && (toolkit.formulas || toolkit.chemistry || toolkit.toolbar.length > 0);
  // AnimatePresence lets the toolbar slide closed instead of vanishing.
  // key: switching the subject starts the toolbar fresh (on its first tab).
  return <AnimatePresence initial={false}>{show && <SubjectToolbar key={toolkit.id} toolkit={toolkit} />}</AnimatePresence>;
}
