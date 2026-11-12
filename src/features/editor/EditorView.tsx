"use client";

import { ArrowLeft, PencilRuler, SearchX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { useT } from "@/i18n/language";
import { useTest } from "@/lib/storage/useTests";

/** The test editor page. For now it only shows which test is open. */
export function EditorView() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const lookup = useTest(id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("editor.back")}
      </Link>

      {lookup.status === "loading" && <div className="h-72" aria-busy="true" />}

      {lookup.status === "missing" && (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
          <SearchX className="size-10 text-slate-400" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold">{t("editor.notFoundTitle")}</h1>
          <p className="mt-2 max-w-md text-slate-600">{t("editor.notFoundText")}</p>
          <Link href="/" className={buttonClasses("secondary", "mt-6")}>
            {t("editor.backHome")}
          </Link>
        </div>
      )}

      {lookup.status === "ready" && (
        <>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
            {lookup.test.title || t("test.untitled")}
          </h1>
          <div className="mt-8 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <PencilRuler className="size-8" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">{t("editor.comingSoonTitle")}</h2>
            <p className="mt-2 max-w-md text-slate-600">{t("editor.comingSoonText")}</p>
          </div>
        </>
      )}
    </div>
  );
}
