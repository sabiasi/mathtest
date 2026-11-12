"use client";

import { ClipboardList, Info, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { useLanguage, useT } from "@/i18n/language";
import { createTest } from "@/lib/storage/testsRepository";
import { useTests } from "@/lib/storage/useTests";
import { TestCard } from "./TestCard";

/** The home page: "My tests". */
export function HomeView() {
  const t = useT();
  const language = useLanguage();
  const router = useRouter();
  const tests = useTests();

  function handleCreate() {
    const test = createTest({
      subject: t("test.defaultSubject"),
      // Georgian interface → ა, ბ, გ, დ; English interface → A, B, C, D
      labelStyle: language === "en" ? "latin" : "georgian",
    });
    router.push(`/editor/${test.id}`);
  }

  const createButton = (
    <button type="button" onClick={handleCreate} className={buttonClasses("primary")}>
      <Plus className="size-5" aria-hidden="true" />
      {t("home.createNew")}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("home.title")}</h1>
          <p className="mt-1.5 max-w-2xl text-slate-600">{t("home.subtitle")}</p>
        </div>
        {tests && tests.length > 0 && createButton}
      </div>

      <div className="mt-8">
        {tests === null ? (
          // Still reading localStorage — keep the space so nothing jumps.
          <div className="h-72" aria-busy="true" />
        ) : tests.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <ClipboardList className="size-8" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">{t("home.emptyTitle")}</h2>
            <p className="mt-2 max-w-md text-slate-600">{t("home.emptyText")}</p>
            <div className="mt-7">{createButton}</div>
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
