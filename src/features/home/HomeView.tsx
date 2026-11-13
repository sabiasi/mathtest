"use client";

import { BookOpen, ClipboardList, CloudOff, Info, LoaderCircle, PencilLine, Plus, Printer, RotateCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { GuestBanner } from "@/components/GuestBanner";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { NewTestDialog } from "@/features/subjects/NewTestDialog";
import { useLanguage, useT } from "@/i18n/language";
import { cleanUpImages } from "@/lib/images/imageStore";
import { createSampleTest } from "@/lib/sample";
import { createTest, retryLoad } from "@/lib/storage/testsRepository";
import { useLoadStatus, useTests } from "@/lib/storage/useTests";
import { dictionaries } from "@/i18n/dictionaries";
import { subjectFromText, type SubjectId } from "@/subjects/ids";
import { getToolkit } from "@/subjects/registry";
import { TestCard } from "./TestCard";

/** The "My tests" page (/tests). */
export function HomeView() {
  const t = useT();
  const language = useLanguage();
  const router = useRouter();
  const tests = useTests();
  const loadStatus = useLoadStatus();
  const { user, profile, guest, updateProfile } = useAuth();
  const [openingSample, setOpeningSample] = useState(false);
  const [choosingSubject, setChoosingSubject] = useState(false);
  // From Settings: the subject marked "Default" in the "which subject?" window.
  const defaultSubject = subjectFromText(profile?.default_subject ?? "");

  // Tidy up: delete stored pictures that no test uses any more (e.g. from
  // deleted tests or removed images). Runs quietly in the background.
  // Only once the tests are loaded — while loading the list is empty, and
  // every picture would look unused!
  useEffect(() => {
    if (tests) void cleanUpImages(tests);
  }, [tests]);

  // A brand-new account: add the sample test once, so the page isn't empty
  // and the teacher can see what a finished test looks like.
  const addingSample = useRef(false);
  useEffect(() => {
    if (tests === null || !user || !profile || profile.sample_added || addingSample.current) return;
    if (tests.length > 0) {
      addingSample.current = true; // already has tests: no sample needed
      void updateProfile({ sample_added: true });
      return;
    }
    addingSample.current = true;
    void updateProfile({ sample_added: true }).then(() => createSampleTest(language));
  }, [tests, user, profile, language, updateProfile]);

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

  async function handleOpenSample() {
    setOpeningSample(true);
    const test = await createSampleTest(language);
    router.push(`/editor/${test.id}`);
  }

  const createButton = (
    <Button onClick={() => setChoosingSubject(true)}>
      <Plus className="size-5" aria-hidden="true" />
      {t("home.createNew")}
    </Button>
  );
  const sampleButton = (
    <Button variant="outline" onClick={handleOpenSample} disabled={openingSample}>
      {openingSample ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <BookOpen className="size-5" aria-hidden="true" />}
      {t("home.openSample")}
    </Button>
  );

  return (
    <PageTransition className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("home.title")}</h1>
          <p className="mt-1.5 max-w-2xl text-[15px] text-muted-foreground">{t("home.subtitle")}</p>
        </div>
        {tests && tests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sampleButton}
            {createButton}
          </div>
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
        ) : tests === null ? (
          <CardsSkeleton />
        ) : tests.length === 0 ? (
          <EmptyState
            Icon={ClipboardList}
            title={t("home.emptyTitle")}
            text={t("home.emptyText")}
            actions={
              <>
                {createButton}
                {sampleButton}
              </>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* `layout`: when a card is added or removed, the others glide to their new places. */}
            <AnimatePresence initial={false} mode="popLayout">
              {tests.map((test) => (
                <motion.li
                  key={test.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                >
                  <TestCard test={test} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
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
