"use client";

import { ClipboardList, CloudOff, Info, PencilLine, Plus, Printer, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { GuestBanner } from "@/components/GuestBanner";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { NewTestDialog } from "@/features/subjects/NewTestDialog";
import { SubjectIcon } from "@/features/subjects/SubjectPicker";
import { dictionaries } from "@/i18n/dictionaries";
import { useLanguage, useT } from "@/i18n/language";
import { cleanUpImages } from "@/lib/images/imageStore";
import { countBySubject, filterTests, gradesOf, groupBySubject, sortTests, type HomeView as View, type SortKey } from "@/lib/myTests";
import { createTest, retryLoad } from "@/lib/storage/testsRepository";
import type { Test } from "@/lib/storage/types";
import { useLoadStatus, useTests } from "@/lib/storage/useTests";
import { isSubjectId, subjectFromText, type SubjectId } from "@/subjects/ids";
import { getToolkit } from "@/subjects/registry";
import { FilterBar } from "./FilterBar";
import { SubjectNav } from "./SubjectNav";
import { SubjectSection } from "./SubjectSection";
import { CardGrid, NoMatches } from "./CardGrid";

const VIEW_KEY = "mathtest:home-view";
const SHOW_ALL_KEY = "mathtest:home-all-subjects";

function remembered(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}
function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode: just not remembered.
  }
}

/** The "My tests" page (/tests): tests organised by subject, never mixed. */
export function HomeView() {
  const t = useT();
  const language = useLanguage();
  const router = useRouter();
  const tests = useTests();
  const loadStatus = useLoadStatus();
  const { profile, guest } = useAuth();
  const [choosingSubject, setChoosingSubject] = useState(false);
  // From Settings: the subject marked "Default" in the "which subject?" window.
  const defaultSubject = subjectFromText(profile?.default_subject ?? "");

  // Which subject is open (remembered in this browser) and whether empty subjects show.
  const [view, setViewState] = useState<View>(() => {
    const saved = remembered(VIEW_KEY);
    return saved && isSubjectId(saved) ? saved : "all";
  });
  const [showAllSubjects, setShowAllSubjects] = useState(() => remembered(SHOW_ALL_KEY) === "1");
  function setView(next: View) {
    setViewState(next);
    remember(VIEW_KEY, next);
  }
  function toggleShowAll() {
    setShowAllSubjects((v) => {
      remember(SHOW_ALL_KEY, v ? "0" : "1");
      return !v;
    });
  }

  // Tidy up: delete stored pictures that no test uses any more (e.g. from
  // deleted tests or removed images). Runs quietly in the background.
  // Only once the tests are loaded — while loading the list is empty, and
  // every picture would look unused!
  useEffect(() => {
    if (tests) void cleanUpImages(tests);
  }, [tests]);

  function handleCreate(subjectId: SubjectId) {
    setChoosingSubject(false);
    const toolkit = getToolkit(subjectId);
    const test = createTest({
      // From Settings: the teacher's school.
      schoolName: profile?.school_name ?? "",
      subjectId,
      // English tests print in English, so their subject name is English too.
      subject: toolkit.print.language ? dictionaries[toolkit.print.language][`subject.${subjectId}`] : t(`subject.${subjectId}`),
      // English tests: A, B, C, D. Otherwise by interface: ა, ბ, გ, დ or A, B, C, D.
      labelStyle: toolkit.labelStyle ?? (language === "en" ? "latin" : "georgian"),
    });
    toast.success(t("toast.created"));
    router.push(`/editor/${test.id}`);
  }

  const counts = useMemo(() => (tests ? countBySubject(tests) : null), [tests]);

  return (
    <PageTransition className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("home.title")}</h1>
          <p className="mt-1.5 max-w-2xl text-[15px] text-muted-foreground">{t("home.subtitle")}</p>
        </div>
        {tests && tests.length > 0 && view === "all" && (
          <Button onClick={() => setChoosingSubject(true)}>
            <Plus className="size-5" aria-hidden="true" />
            {t("home.createNew")}
          </Button>
        )}
      </div>

      <GuestBanner className="mt-6" />

      {/* A short guide while the teacher is just starting out. */}
      {tests && tests.length <= 1 && <HowItWorks />}

      <div className="mt-8">
        {loadStatus === "error" ? (
          <EmptyState
            Icon={CloudOff}
            title={t("home.loadError")}
            text={t("authError.network")}
            actions={
              <Button variant="outline" onClick={retryLoad}>
                <RotateCw className="size-4" aria-hidden="true" />
                {t("home.retry")}
              </Button>
            }
          />
        ) : tests === null || counts === null ? (
          <CardsSkeleton />
        ) : (
          <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
            <SubjectNav
              view={view}
              counts={counts}
              total={tests.length}
              showAll={showAllSubjects}
              onShowAll={toggleShowAll}
              onSelect={setView}
            />
            <div className="min-w-0 max-lg:mt-6">
              {view === "all" ? (
                <AllTests
                  tests={tests}
                  onOpenSubject={setView}
                  onCreate={() => setChoosingSubject(true)}
                  onOpenSample={() => router.push(`/editor/sample-${defaultSubject ?? "math"}`)}
                />
              ) : (
                <SubjectSection key={view} subjectId={view} tests={tests.filter((test) => test.subjectId === view)} onCreate={() => handleCreate(view)} />
              )}
            </div>
          </div>
        )}
      </div>

      <p className="mt-10 flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t(guest ? "guest.storageNote" : "home.storageNote")}
      </p>

      <NewTestDialog
        open={choosingSubject}
        onOpenChange={setChoosingSubject}
        defaultSubject={defaultSubject}
        onPick={handleCreate}
      />
    </PageTransition>
  );
}

/** "All tests": every subject that has tests, under its own heading (search, grade and sort apply to all). */
function AllTests({
  tests,
  onOpenSubject,
  onCreate,
  onOpenSample,
}: {
  tests: Test[];
  onOpenSubject: (id: SubjectId) => void;
  onCreate: () => void;
  onOpenSample: () => void;
}) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");

  if (tests.length === 0) {
    return (
      <EmptyState
        Icon={ClipboardList}
        title={t("home.emptyTitle")}
        text={t("home.emptyText")}
        actions={
          <>
            <Button onClick={onCreate}>
              <Plus className="size-5" aria-hidden="true" />
              {t("home.createNew")}
            </Button>
            <Button variant="outline" onClick={onOpenSample}>
              {t("home.openSample")}
            </Button>
          </>
        }
      />
    );
  }

  const shown = sortTests(filterTests(tests, { search, grade, folder: null }), sort);
  const groups = groupBySubject(shown);
  return (
    <div className="space-y-8" data-all-tests="">
      <FilterBar search={search} onSearch={setSearch} grades={gradesOf(tests)} grade={grade} onGrade={setGrade} sort={sort} onSort={setSort} />
      {groups.length === 0 ? (
        <NoMatches
          onClear={() => {
            setSearch("");
            setGrade("");
          }}
        />
      ) : (
        groups.map((group) => (
          <section key={group.subjectId} aria-labelledby={`group-${group.subjectId}`} data-subject-group={group.subjectId}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <SubjectIcon id={group.subjectId} className="p-2" iconClassName="size-5" />
              <h2 id={`group-${group.subjectId}`} className="text-lg font-semibold">
                {t(`subject.${group.subjectId}`)}
              </h2>
              <span className="rounded-full bg-muted px-2 text-sm font-medium text-soft-foreground tabular-nums">{group.tests.length}</span>
              <button type="button" className="ml-auto text-sm font-medium text-brand hover:underline" onClick={() => onOpenSubject(group.subjectId)}>
                {t("home.openSubject", { subject: t(`subject.${group.subjectId}`) })} →
              </button>
            </div>
            <CardGrid tests={group.tests} />
          </section>
        ))
      )}
    </div>
  );
}

/** Card-shaped grey placeholders while the tests are read. */
function CardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-9 w-32" />
        </div>
      ))}
    </div>
  );
}

function HowItWorks() {
  const t = useT();
  const steps = [
    { Icon: Plus, text: t("home.step1") },
    { Icon: PencilLine, text: t("home.step2") },
    { Icon: Printer, text: t("home.step3") },
  ];
  return (
    <section className="mt-6 rounded-2xl border border-primary-soft-border bg-primary-soft/60 p-5">
      <h2 className="text-lg font-semibold text-foreground">{t("home.welcomeTitle")}</h2>
      <ol className="mt-3 grid gap-3 md:grid-cols-3">
        {steps.map(({ Icon, text }, i) => (
          <li key={i} className="flex gap-3 rounded-xl bg-card p-3.5 text-[15px] leading-snug text-soft-foreground shadow-xs">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <span>
              <Icon className="mr-1 inline size-4 align-[-2px] text-brand" aria-hidden="true" />
              {text}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
