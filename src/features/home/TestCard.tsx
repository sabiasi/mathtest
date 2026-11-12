"use client";

import { FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useLanguage, useT } from "@/i18n/language";
import { formatDateTime } from "@/lib/format";
import { deleteTest } from "@/lib/storage/testsRepository";
import type { Test } from "@/lib/storage/types";

/** One test in the "My tests" list. The whole card is clickable. */
export function TestCard({ test }: { test: Test }) {
  const t = useT();
  const language = useLanguage();
  const title = test.title || t("test.untitled");

  function handleDelete() {
    if (window.confirm(t("home.deleteConfirm", { title }))) {
      deleteTest(test.id);
    }
  }

  return (
    <article className="relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <h2 className="min-w-0 flex-1 pt-1 font-semibold leading-snug">
          {/* The ::after layer stretches this link over the whole card. */}
          <Link
            href={`/editor/${test.id}`}
            className="line-clamp-2 rounded after:absolute after:inset-0 after:rounded-xl"
          >
            {title}
          </Link>
        </h2>
        <button
          type="button"
          onClick={handleDelete}
          aria-label={t("home.delete")}
          title={t("home.delete")}
          className="relative z-10 -m-1 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-4 text-sm text-slate-600">
        {t("home.questionCount", { count: test.questions.length })}
      </p>
      <p className="mt-auto pt-2 text-xs text-slate-500">
        {t("home.updatedAt", { date: formatDateTime(test.updatedAt, language) })}
      </p>
    </article>
  );
}
