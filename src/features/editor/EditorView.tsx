"use client";

import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { useT } from "@/i18n/language";
import { useTest } from "@/lib/storage/useTests";
import { TestEditor } from "./TestEditor";

/** The /editor/[id] page: finds the test, then shows the editor. */
export function EditorView() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const lookup = useTest(id);

  if (lookup.status === "loading") {
    return <div className="h-72" aria-busy="true" />;
  }

  if (lookup.status === "missing") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("editor.back")}
        </Link>
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
          <SearchX className="size-10 text-slate-400" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold">{t("editor.notFoundTitle")}</h1>
          <p className="mt-2 max-w-md text-slate-600">{t("editor.notFoundText")}</p>
          <Link href="/" className={buttonClasses("secondary", "mt-6")}>
            {t("editor.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  // `key` makes React start a fresh editor if a different test is opened.
  return <TestEditor key={lookup.test.id} initialTest={lookup.test} />;
}
