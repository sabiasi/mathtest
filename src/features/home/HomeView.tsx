"use client";

import { BookOpen, ClipboardList, Info, LoaderCircle, PencilLine, Plus, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { useLanguage, useT } from "@/i18n/language";
import { cleanUpImages } from "@/lib/images/imageStore";
import { createSampleTest } from "@/lib/sample";
import { createTest, listTests } from "@/lib/storage/testsRepository";
import { useTests } from "@/lib/storage/useTests";
import { TestCard } from "./TestCard";

/** Remembers that we already gave this browser the sample test once. */
const SAMPLE_FLAG = "mathtest:sample-added";

/** The home page: "My tests". */
export function HomeView() {
  const t = useT();
  const language = useLanguage();
  const router = useRouter();
  const tests = useTests();
  const [openingSample, setOpeningSample] = useState(false);

  // Tidy up: delete stored pictures that no test uses any more (e.g. from
  // deleted tests or removed images). Runs quietly in the background.
  useEffect(() => {
    void cleanUpImages(listTests());
  }, [tests]);

  // The very first visit: add the sample test once, so the page isn't empty
  // and the teacher can see what a finished test looks like.
  useEffect(() => {
    if (tests === null) return;
    try {
      if (localStorage.getItem(SAMPLE_FLAG)) return;
      localStorage.setItem(SAMPLE_FLAG, "1"); // set first, so it can't happen twice
    } catch {
      return;
    }
    if (tests.length === 0) void createSampleTest(language);
  }, [tests, language]);

  function handleCreate() {
    const test = createTest({
      subject: t("test.defaultSubject"),
      // Georgian interface → ა, ბ, გ, დ; English interface → A, B, C, D
      labelStyle: language === "en" ? "latin" : "georgian",
    });
    router.push(`/editor/${test.id}`);
  }

  async function handleOpenSample() {
    setOpeningSample(true);
    const test = await createSampleTest(language);
    router.push(`/editor/${test.id}`);
  }

  const createButton = (
    <button type="button" onClick={handleCreate} className={buttonClasses("primary")}>
      <Plus className="size-5" aria-hidden="true" />
      {t("home.createNew")}
    </button>
  );
  const sampleButton = (
    <button type="button" onClick={handleOpenSample} disabled={openingSample} className={buttonClasses("secondary")}>
      {openingSample ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <BookOpen className="size-5" aria-hidden="true" />}
      {t("home.openSample")}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("home.title")}</h1>
          <p className="mt-1.5 max-w-2xl text-slate-600">{t("home.subtitle")}</p>
        </div>
        {tests && tests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sampleButton}
            {createButton}
          </div>
        )}
      </div>

      {/* A short guide while the teacher is just starting out. */}
      {tests && tests.length <= 1 && <HowItWorks />}

      <div className="mt-8">
        {tests === null ? (
          // Still reading localStorage — keep the space so nothing jumps.
          <div className="h-72" aria-busy="true" />
        ) : tests.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <ClipboardList className="size-8" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">{t("home.emptyTitle")}</h2>
            <p className="mt-2 max-w-md text-slate-600">{t("home.emptyText")}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {createButton}
              {sampleButton}
            </div>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tests.map((test) => (
              <li key={test.id}>
                <TestCard test={test} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-10 flex items-start gap-2 text-sm text-slate-500">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t("home.storageNote")}
      </p>
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
    <section className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
      <h2 className="text-lg font-semibold text-indigo-950">{t("home.welcomeTitle")}</h2>
      <ol className="mt-3 grid gap-3 md:grid-cols-3">
        {steps.map(({ Icon, text }, i) => (
          <li key={i} className="flex gap-3 rounded-xl bg-white p-3 text-[15px] leading-snug text-slate-700 shadow-sm">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">
              {i + 1}
            </span>
            <span>
              <Icon className="mr-1 inline size-4 align-[-2px] text-indigo-600" aria-hidden="true" />
              {text}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
