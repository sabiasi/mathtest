"use client";

import { Copy, FileText, Pencil, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useLanguage, useT } from "@/i18n/language";
import { formatDateTime } from "@/lib/format";
import { formatPoints, totalPoints } from "@/lib/questions";
import { deleteTest, duplicateTest } from "@/lib/storage/testsRepository";
import type { Test } from "@/lib/storage/types";

/** One test in the "My tests" list. Clicking the card opens the editor. */
export function TestCard({ test }: { test: Test }) {
  const t = useT();
  const language = useLanguage();
  const title = test.title || t("test.untitled");
  const editUrl = `/editor/${test.id}`;
  const details = [test.subject, test.grade].filter(Boolean).join(" · ");

  function handleDuplicate() {
    duplicateTest(test.id, test.title ? t("test.copyTitle", { title: test.title }) : "");
  }

  function handleDelete() {
    if (window.confirm(t("home.deleteConfirm", { title }))) {
      deleteTest(test.id);
    }
  }

  const action =
    "relative z-10 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";

  return (
    <article className="relative flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-indigo-300 hover:shadow-md">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="font-semibold leading-snug">
              {/* The ::after layer stretches this link over the whole card. */}
              <Link href={editUrl} className="line-clamp-2 rounded after:absolute after:inset-0 after:rounded-xl">
                {title}
              </Link>
            </h2>
            {details && <p className="mt-0.5 truncate text-sm text-slate-500">{details}</p>}
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          {t("home.questionCount", { count: test.questions.length })}
          <span className="mx-1.5 text-slate-300">·</span>
          {t("home.totalPoints", { points: formatPoints(totalPoints(test.questions)) })}
        </p>
        <p className="mt-auto pt-2 text-xs text-slate-500">
          {t("home.updatedAt", { date: formatDateTime(test.updatedAt, language) })}
        </p>
      </div>

      <div className="flex items-center gap-1 border-t border-slate-100 px-3 py-2">
        <Link href={editUrl} className={action}>
          <Pencil className="size-4" aria-hidden="true" />
          {t("home.edit")}
        </Link>
        <button type="button" onClick={handleDuplicate} className={action} title={t("home.duplicateLabel")}>
          <Copy className="size-4" aria-hidden="true" />
          {t("home.duplicate")}
        </button>
        <Link href={`/print/${test.id}`} className={`${action} ml-auto`} aria-label={t("home.print")} title={t("home.print")}>
          <Printer className="size-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          className={`${action} hover:bg-red-50 hover:text-red-600`}
          aria-label={t("home.delete")}
          title={t("home.delete")}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
