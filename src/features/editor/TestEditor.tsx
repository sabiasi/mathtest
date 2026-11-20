"use client";

import { isTypeHidden } from "@/lib/offeredTypes";
import { isDeviceTestId } from "@/lib/auth/teachingSubjects";
import { useTeachingSubjects } from "@/features/subjects/TeachingSubjectsProvider";

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
  Columns2,
  TextCursorInput,
  ToggleRight,
  CloudSun,
  Ruler,
  Copy,
  Sparkles, Library, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useConfirm } from "@/components/ConfirmDialog";
import { GuestBanner } from "@/components/GuestBanner";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MathEditingProvider, useMathEditing, useMathLiveReady } from "@/features/math/MathEditingContext";
import { useLanguage, useT } from "@/i18n/language";
import { createQuestion, duplicateQuestion, formatPoints, questionNumbers, totalPoints } from "@/lib/questions";
import { isRichTextEmpty } from "@/lib/richText";
import { useSaveState, useSharedTest, useStorageKind } from "@/lib/storage/useTests";
import { isSharedId, refreshTest } from "@/lib/storage/testsRepository";
import { useShare, useSharingOffered } from "@/features/sharing/ShareDialog";
import { useCoEditing } from "@/features/sharing/useCoEditing";
import { useCopyShared } from "@/features/sharing/useCopyShared";
import { initials } from "@/lib/sharing/sharing";
import type { Question, QuestionType, Test } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { getToolkit, offeredQuestionTypes } from "@/subjects/registry";
import type { SubjectToolkit } from "@/subjects/types";
import { useUseAsTemplate } from "@/features/samples/useTemplate";
import { isSampleId } from "@/samples/build";
import { revealFocused } from "./keepVisible";
import { QuestionList } from "./questions/QuestionList";
import { PreviewProvider, usePreviewControl } from "./preview/PreviewContext";
import { LivePreview } from "./preview/LivePreview";
import { TrialNote } from "@/features/auth/GuestTrial";
import { SubjectToolbar } from "./SubjectToolbar";
import { TestHeaderForm } from "./TestHeaderForm";
import { useAutosave } from "./useAutosave";
import { AiGenerateDialog } from "@/features/ai/AiGenerateDialog";
import { BankInsertDialog } from "@/features/bank/BankInsertDialog";
import { useBankMessages } from "@/features/bank/BankView";
import { saveToBank } from "@/lib/bank/bankStore";
import { seatActive } from "@/lib/plans/entitlements";
import { shareWithSchool } from "@/lib/schools/schoolBankStore";
import { usePlan } from "@/features/plans/PlanProvider";
import { useUpgrade } from "@/features/plans/UpgradeDialog";
import { useAuth } from "@/features/auth/AuthProvider";
import { useGuestTrial } from "@/features/auth/GuestTrial";
import { aiTypesFor } from "@/lib/ai/request";
import { READY } from "@/lib/plans/plans";

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
  "scale-calc": Ruler,
  "climate-chart": CloudSun,
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
  const access = useTeachingSubjects();
  const sample = isSampleId(initialTest.id);
  const locked = isDeviceTestId(initialTest.id) || !access.canEdit(initialTest.subjectId);
  // A colleague's test: "edit" lets me change it (in a subject I teach), "view" doesn't.
  const shared = useSharedTest(initialTest.id);
  const foreign = isSharedId(initialTest.id);
  const readOnly = sample || locked || (foreign && shared?.role !== "edit");
  const language = useLanguage();
  const confirm = useConfirm();
  const [test, setTest] = useState(initialTest);
  const [dirty, setDirty] = useState(false); // true = has unsaved changes
  const [focusId, setFocusId] = useState<string | null>(null);
  const mathReady = useMathLiveReady();

  // The sticky bar and the toolbar hanging under it cover the top of the
  // window. Their height goes into --editor-top, so focused boxes are never
  // scrolled underneath (see keepVisible.ts and globals.css). The toolbar is
  // an overlay: opening it, closing it or switching its tabs never moves the
  // page content.
  const stickyRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = stickyRef.current;
    const toolbar = toolbarRef.current;
    if (!bar) return;
    const root = document.documentElement;
    let last = 0;
    const measure = () => {
      const height = bar.offsetHeight + (toolbar?.offsetHeight ?? 0);
      root.style.setProperty("--editor-top", `${height}px`);
      // The live paper view starts right under the bar (the toolbar never covers it).
      root.style.setProperty("--editor-bar", `${bar.offsetHeight}px`);
      // The toolbar grew (it opened, or the teacher made it taller): the box
      // being edited must not end up hidden under it. Shrinking never scrolls,
      // and scrolling doesn't change the toolbar's height — so no loop.
      if (height > last) revealFocused();
      last = height;
    };
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    if (toolbar) observer.observe(toolbar);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--editor-top");
      root.style.removeProperty("--editor-bar");
    };
  }, [mathReady]);

  const markSaved = useCallback(() => setDirty(false), []);
  useAutosave(test, dirty && !readOnly, markSaved);
  // "dirty" = typed but not handed to the repository yet; cloudState = on its way to the cloud.
  const cloudState = useSaveState(test.id);
  const onDevice = useStorageKind() === "device"; // a guest: saved in this browser only
  const saveState = cloudState === "error" ? "error" : dirty || cloudState === "saving" ? "saving" : "saved";

  // Sharing: who else has the test open, and a note to them after each of my saves.
  const coEditing = useCoEditing(test.id);
  const { announceSaved } = coEditing;
  const lastCloudState = useRef(cloudState);
  useEffect(() => {
    if (lastCloudState.current === "saving" && cloudState === "saved") announceSaved();
    lastCloudState.current = cloudState;
  }, [cloudState, announceSaved]);
  const share = useShare();
  const sharingOffered = useSharingOffered();
  const copyShared = useCopyShared();

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
    if (readOnly) return;
    setTest((prev) => ({ ...prev, ...changes }));
    setDirty(true);
  }

  function updateQuestions(change: (questions: Question[]) => Question[]) {
    if (readOnly) return;
    setTest((prev) => ({ ...prev, questions: change(prev.questions) }));
    setDirty(true);
  }

  function addQuestion(type: QuestionType, prepare?: (question: Question) => Question) {
    const fresh = createQuestion(type);
    const question = prepare ? prepare(fresh) : fresh;
    updateQuestions((qs) => [...qs, question]);
    setFocusId(question.id);
  }

  // "AI-ით შექმნა": guests are offered a free account; teachers get the dialog.
  const { guest, status: authStatus } = useAuth();
  const guestTrial = useGuestTrial();
  const [aiOpen, setAiOpen] = useState(false);
  const aiOffered = READY.aiGenerator && aiTypesFor(getToolkit(test.subjectId).questionTypes).length > 0;
  function insertFromAi(questions: Question[]) {
    if (questions.length === 0) return;
    updateQuestions((qs) => [...qs, ...questions]);
    setFocusId(questions[0].id);
  }

  // "Save to my bank" / "Insert from bank" (Premium). Guests are offered a free account.
  const plan = usePlan();
  const upgrade = useUpgrade();
  const bankReport = useBankMessages();
  const [bankOpen, setBankOpen] = useState(false);
  const bankOffered = READY.questionBank && authStatus !== "unconfigured";
  const bankAllowed = () => {
    if (guest) guestTrial.show();
    else if (!plan.entitlements.features.questionBank) upgrade("bank");
    else return true;
    return false;
  };
  async function saveQuestionToBank(question: Question) {
    if (!bankAllowed()) return;
    if (bankReport(await saveToBank(question, { subject: test.subjectId, grade: test.grade }))) toast.success(t("bank.saved"));
  }
  // "Save to the school bank" (School plan): only for teachers with a seat in an active school.
  const schoolBankOffered = READY.sharedBank && !guest && seatActive(plan.entitlements.school) && plan.entitlements.features.sharedBank;
  async function shareQuestionWithSchool(question: Question) {
    const result = await shareWithSchool(question, { subject: test.subjectId, grade: test.grade, department: plan.entitlements.school?.department ?? "" });
    if (result === "ok") toast.success(t("schoolBank.saved"));
    else toast.error(t(result === "full" ? "schoolBank.full" : `mySchool.error.${result}`));
  }
  function insertFromBank(questions: Question[]) {
    insertFromAi(questions);
    if (questions.length > 0) toast.success(t("bank.inserted", { count: questions.length }));
  }

  function duplicate(question: Question) {
    const copy = duplicateQuestion(question);
    updateQuestions((qs) => {
      const index = qs.findIndex((q) => q.id === question.id);
      return [...qs.slice(0, index + 1), copy, ...qs.slice(index + 1)];
    });
    setFocusId(copy.id);
  }

  // ---- Moving a question (arrows, "⋯" menu, Alt+↑/↓) ----
  const [moveTick, setMoveTick] = useState(0);
  // What had focus and which question moved: put back / shown after the move.
  const moved = useRef<{ focus: Element | null; id: string } | null>(null);
  function moveQuestion(question: Question, to: number) {
    const from = test.questions.findIndex((q) => q.id === question.id);
    if (from < 0 || to === from || to < 0 || to >= test.questions.length) return;
    const before = test.questions.map((q) => q.id);
    moved.current = { focus: document.activeElement, id: question.id };
    updateQuestions((qs) => arrayMove(qs, qs.findIndex((q) => q.id === question.id), to));
    setMoveTick((n) => n + 1);
    toast(t("toast.moved", { position: to + 1 }), {
      id: "question-moved", // one toast for a series of moves
      action: {
        label: t("toast.undo"),
        // Back to the order before this move (keeping everything typed since).
        onClick: () => {
          moved.current = { focus: null, id: question.id };
          updateQuestions((qs) => [...qs].sort((a, b) => orderIn(before, a.id) - orderIn(before, b.id)));
          setMoveTick((n) => n + 1);
        },
      },
    });
  }
  useLayoutEffect(() => {
    const info = moved.current;
    if (!info) return;
    moved.current = null;
    // React may have moved the focused element in the page: give the focus back (the cursor stays).
    if (info.focus instanceof HTMLElement && info.focus.isConnected && document.activeElement !== info.focus) {
      info.focus.focus({ preventScroll: true });
    }
    // Keep the moved question in view: scroll gently only when its top left the window.
    const card = document.querySelector(`[data-question-card][data-question-id="${CSS.escape(info.id)}"]`)?.closest("li");
    if (!card) return;
    const rect = card.getBoundingClientRect(); // the <li> isn't animated: its real, new place
    const top = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--editor-top")) || 56) + 12;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (rect.top < top) window.scrollBy({ top: rect.top - top, behavior });
    else if (rect.top > window.innerHeight - 96) window.scrollBy({ top: rect.top - window.innerHeight * 0.35, behavior });
  }, [moveTick]);

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
  // A sample test ("ნიმუში") is shown read-only: look, read the tips, or make a copy.

  const makeCopy = useUseAsTemplate();
  // The subject's toolkit decides the toolbar and which question types are offered.
  const toolkit = getToolkit(test.subjectId);

  return (
    <MathEditingProvider>
      <PreviewProvider test={test}>
      {/* lang: the browser spellchecks English tests in English. */}
      <div className="pb-24" data-editor-ready={mathReady ? "true" : "false"} lang={toolkit.contentLanguage} spellCheck>
        {/* Sticky bar: stays at the top while scrolling. */}
        <div ref={stickyRef} className="sticky top-0 z-20 border-b bg-card/85 shadow-sm backdrop-blur-md" data-editor-bar="">
          <BarRow>
            <Link
              href="/tests"
              // Leaving saves right away (see useAutosave). Say "saved" only when that is true:
              // a guest's browser storage is written at once, an account's upload may still be on its way.
              onClick={() => !readOnly && (saveState === "saved" || (onDevice && saveState !== "error")) && toast.success(t("toast.saved"))}
              className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {/* On phones only the arrow shows; screen readers still hear the text. */}
              <span className="max-sm:sr-only">{t("editor.back")}</span>
            </Link>
            <div className="flex flex-1 items-center justify-end gap-2">
              {coEditing.others.length > 0 && (
                <span className="flex items-center -space-x-1.5" role="status" aria-label={t("shared.editingNow", { names: coEditing.others.map((person) => person.name || t("shared.someone")).join(", ") })} data-co-editors="">
                  {coEditing.others.slice(0, 4).map((person) => (
                    <span key={person.id} title={person.name || t("shared.someone")} data-co-editor={person.name}
                      className="inline-flex size-7 items-center justify-center rounded-full border-2 border-card bg-primary-soft text-[11px] font-semibold text-brand">
                      {initials(person.name)}
                    </span>
                  ))}
                </span>
              )}
              {/* Signed-in teachers only (a guest can't share); the card's "…" menu offers it to guests. */}
              {sharingOffered && !guest && !sample && !foreign && !isDeviceTestId(test.id) && (
                <button type="button" className={buttonVariants({ variant: "outline", size: "sm" })} onClick={() => share({ id: test.id, title: test.title })} data-share-button="">
                  <Share2 className="size-4" aria-hidden="true" />
                  {/* The bar is crowded on tablets: the word only from 1024 px. */}
                  <span className="max-lg:sr-only group-data-[split=true]:sr-only">{t("share.action")}</span>
                </button>
              )}
              <PaperViewButton />
              <Link href={`/print/${encodeURIComponent(test.id)}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Printer className="size-4" aria-hidden="true" />
                <span className="max-sm:sr-only">{t("editor.printPreview")}</span>
              </Link>
            </div>
            {sample ? (
              <button type="button" className={buttonVariants({ size: "sm" })} onClick={() => void makeCopy(test)} data-use-template="">
                <Copy className="size-4" aria-hidden="true" />
                <span className="max-sm:sr-only">{t("sample.useTemplate")}</span>
              </button>
            ) : readOnly ? <span className="text-sm text-muted-foreground">{t("teaching.readOnly")}</span> : (
            <span
              className={cn("flex items-center gap-1.5 text-sm", saveState === "error" ? "text-destructive-text" : "text-muted-foreground")}
              aria-live="polite"
              data-save-state={saveState}
            >
              {saveState === "error" ? (
                <>
                  <CloudAlert className="size-4" aria-hidden="true" />
                  <span className="max-sm:sr-only group-data-[split=true]:sr-only">{t("editor.saveError")}</span>
                </>
              ) : saveState === "saving" ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  <span className="max-sm:sr-only group-data-[split=true]:sr-only">{t("editor.saving")}</span>
                </>
              ) : (
                <>
                  {onDevice ? (
                    <HardDrive className="size-4 text-success" aria-hidden="true" />
                  ) : (
                    <CloudCheck className="size-4 text-success" aria-hidden="true" />
                  )}
                  <span className="max-sm:sr-only group-data-[split=true]:sr-only">{t(onDevice ? "editor.savedDevice" : "editor.saved")}</span>
                </>
              )}
            </span>
            )}
            <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold whitespace-nowrap text-brand tabular-nums">
              {t("editor.total", { points: total })}
            </span>
          </BarRow>
          {/*
            The toolbar hangs UNDER the bar as an overlay (it takes no room in
            the page). Its height is the teacher's choice, fitted to the window
            by SubjectToolbar; the max-height here is only a safety net for
            very short windows (a phone lying on its side).
          */}
          <ToolbarArea ref={toolbarRef}>{mathReady && <ToolbarWhenEditing toolkit={toolkit} />}</ToolbarArea>
        </div>

        {!mathReady ? (
          <EditorSkeleton label={t("editor.loading")} />
        ) : (
          <SplitView>
          <FollowFocus>
          <div className="mx-auto w-full max-w-3xl min-w-0 space-y-8 px-4 pt-8 sm:px-6">
            {/* Guests: their one free trial test (samples are just for looking). */}
            {sample ? <GuestBanner /> : <TrialNote />}
            {sample && (
              <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-primary-soft-border bg-primary-soft/60 p-5" data-sample-banner="">
                <Sparkles className="mt-0.5 size-6 shrink-0 text-brand" aria-hidden="true" />
                <div className="min-w-60 flex-1">
                  <h2 className="font-semibold text-foreground">{t("sample.readOnlyTitle")}</h2>
                  <p className="mt-1 text-[15px] leading-snug text-soft-foreground">{t("sample.readOnlyText")}</p>
                </div>
                <button type="button" className={buttonVariants()} onClick={() => void makeCopy(test)}>
                  <Copy className="size-5" aria-hidden="true" />
                  {t("sample.useTemplate")}
                </button>
              </div>
            )}
            {foreign && shared && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary-soft-border bg-primary-soft/60 p-4" data-shared-banner={readOnly ? "view" : "edit"} role="status">
                <Users className="size-5 shrink-0 text-brand" aria-hidden="true" />
                <p className="min-w-60 flex-1 text-[15px] text-soft-foreground">
                  {t(readOnly ? "shared.bannerView" : "shared.bannerEdit", { name: shared.ownerName || t("shared.someone") })}
                  {shared.role === "edit" && readOnly && <> {t("shared.bannerSubject")}</>}
                </p>
                <button type="button" className={buttonVariants({ variant: "outline", size: "sm" })} disabled={copyShared.busy} onClick={() => void copyShared.copy(test)} data-shared-copy="">
                  <Copy className="size-4" aria-hidden="true" />
                  {t(copyShared.busy ? "shared.copying" : "shared.copy")}
                </button>
              </div>
            )}
            {coEditing.changedBy !== null && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4" data-changed-notice="" role="status">
                <p className="min-w-60 flex-1 text-[15px]">{t("shared.changedBy", { name: coEditing.changedBy || t("shared.someone") })}</p>
                <button type="button" className={buttonVariants({ size: "sm" })} onClick={() => { coEditing.dismissChange(); void refreshTest(test.id); }} data-changed-reload="">
                  {t("shared.changedReload")}
                </button>
              </div>
            )}
            {!sample && locked && !foreign && <div className="rounded-xl border bg-primary-soft p-4" data-subject-readonly="" role="status">
              <h2 className="font-semibold">{t("teaching.readOnly")}</h2>
              <p className="mt-1 text-sm">{t(isDeviceTestId(test.id) ? "teaching.retainedText" : "teaching.lockedText")}</p>
              {!isDeviceTestId(test.id) && <button type="button" className={buttonVariants({ variant: "outline", className: "mt-3" })} onClick={access.manage}>{t("teaching.manage")}</button>}
            </div>}
            {/* inert: a sample can be read (and its tips seen) but not changed. */}
            <div className="space-y-8" inert={readOnly}>
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
                  onSaveToBank={bankOffered && !readOnly ? (question) => void saveQuestionToBank(question) : undefined}
                  onShareWithSchool={schoolBankOffered && !readOnly ? (question) => void shareQuestionWithSchool(question) : undefined}
                  onDelete={remove}
                  onMove={moveQuestion}
                  moveTick={moveTick}
                />
              )}

              {!readOnly && (
              <div className="mt-2 rounded-2xl border bg-card p-4 shadow-sm">
                {aiOffered && (
                  <button
                    type="button"
                    data-ai-open=""
                    onClick={() => (guest ? guestTrial.show() : setAiOpen(true))}
                    className="accent-card mb-4 flex w-full items-center gap-3 rounded-xl border border-primary-soft-border bg-primary-soft/50 px-4 py-3 text-left font-medium transition-colors hover:bg-primary-soft"
                  >
                    <span className="rounded-lg bg-primary p-1.5 text-primary-foreground">
                      <Sparkles className="size-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-brand">{t("ai.button")}</span>
                      <span className="block text-sm font-normal text-muted-foreground">{t("ai.buttonHint")}</span>
                    </span>
                  </button>
                )}
                {bankOffered && (
                  <button
                    type="button"
                    data-bank-open=""
                    onClick={() => bankAllowed() && setBankOpen(true)}
                    className="mb-4 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left font-medium transition-colors hover:bg-accent"
                  >
                    <span className="rounded-lg bg-muted p-1.5 text-soft-foreground">
                      <Library className="size-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block">{t("bank.insert")}</span>
                      <span className="block text-sm font-normal text-muted-foreground">{t("bank.insertHint")}</span>
                    </span>
                  </button>
                )}
                <p className="mb-3 text-sm font-medium text-soft-foreground">{t("questions.add")}:</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {offeredQuestionTypes(test.subjectId).map((type) => {
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
                  {toolkit.presets?.filter((preset) => !isTypeHidden(test.subjectId, preset.type)).map((preset) => (
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
              )}
            </section>
            </div>
          </div>
          </FollowFocus>
          </SplitView>
        )}
      </div>
      {bankOffered && !readOnly && !guest && <BankInsertDialog test={test} open={bankOpen} onClose={() => setBankOpen(false)} onInsert={insertFromBank} />}
      {aiOffered && !readOnly && !guest && <AiGenerateDialog test={test} open={aiOpen} onClose={() => setAiOpen(false)} onInsert={insertFromAi} />}
      </PreviewProvider>
    </MathEditingProvider>
  );
}

/** Grey shapes in the layout of the editor, shown while it loads. */
/** How wide the live paper view is beside the editor. */
const PANEL_WIDTH = "min(48vw, 62rem)";

/** The bar's row: centred over the questions (with the paper view open, over the left side only). */
function BarRow({ children }: { children: ReactNode }) {
  const { open, split } = usePreviewControl();
  return (
    <div style={{ marginRight: open && split ? PANEL_WIDTH : undefined }}>
      {/* group + data-split: with the paper view beside it, the save status shows only its icon (less room). */}
      <div className="group mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 sm:gap-4 sm:px-6" data-split={open && split ? "true" : "false"}>
        {children}
      </div>
    </div>
  );
}

/** The symbol toolbar under the bar: over the editor only, never over the paper view. */
function ToolbarArea({ ref, children }: { ref: Ref<HTMLDivElement>; children: ReactNode }) {
  const { open, split } = usePreviewControl();
  return (
    <div
      ref={ref}
      className="absolute inset-x-0 top-full max-h-[calc(100dvh-6.5rem)] overflow-y-auto overscroll-contain"
      style={{ right: open && split ? PANEL_WIDTH : undefined }}
    >
      {children}
    </div>
  );
}

/** "ქაღალდზე ნახვა": splits the screen — the editor on the left, the whole test on paper on the right. */
function PaperViewButton() {
  const t = useT();
  const { open, toggle } = usePreviewControl();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={open}
          className={buttonVariants({ variant: open ? "default" : "outline", size: "sm" })}
          data-paper-view-toggle=""
        >
          <Columns2 className="size-4" aria-hidden="true" />
          <span className="max-lg:sr-only">{t("preview.show")}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{t("preview.showHint")}</TooltipContent>
    </Tooltip>
  );
}

/** Tells the paper view which question is being edited (the one that has focus), so it can show it. */
function FollowFocus({ children }: { children: ReactNode }) {
  const { setActiveId } = usePreviewControl();
  return (
    <div
      onFocusCapture={(event) => {
        // Also while the view is closed: opening it then shows the question last worked on.
        const target = event.target as HTMLElement;
        const card = target.closest<HTMLElement>("[data-question-id]");
        setActiveId(card ? card.dataset.questionId! : target.closest("[data-test-header]") ? "header" : null);
      }}
    >
      {children}
    </div>
  );
}

/**
 * The live paper view open: wide windows get a split screen — the questions
 * on the left, the paper on the right (sticky, it scrolls on its own); small
 * screens get the paper over the editor. The questions' elements never change
 * shape, so opening it doesn't re-create the editors (cursor and undo stay).
 */
function SplitView({ children }: { children: ReactNode }) {
  const { open, split } = usePreviewControl();
  const side = open && split;
  return (
    <div className={cn(side && "flex items-start")} data-split-view={side ? "on" : "off"}>
      <div className={cn(side && "min-w-0 flex-1")}>{children}</div>
      {open && (
        <aside
          className={side ? "sticky shrink-0 self-start" : "fixed inset-x-0 bottom-0 z-30 bg-background"}
          style={
            side
              ? { top: "var(--editor-bar, 3.5rem)", height: "calc(100dvh - var(--editor-bar, 3.5rem))", width: PANEL_WIDTH }
              : { top: "var(--editor-bar, 3.5rem)" }
          }
        >
          <LivePreview />
        </aside>
      )}
    </div>
  );
}

/** Where `id` was in `order` (unknown ids go last). */
function orderIn(order: string[], id: string) {
  const index = order.indexOf(id);
  return index < 0 ? order.length : index;
}

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
