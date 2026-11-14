"use client";

import { Copy, Eye, ListOrdered, Printer, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useUseAsTemplate } from "@/features/samples/useTemplate";
import { SubjectIcon } from "@/features/subjects/SubjectPicker";
import { useT } from "@/i18n/language";
import { formatPoints, isTextBlock, totalPoints } from "@/lib/questions";
import { sampleFor } from "@/samples";
import type { SubjectId } from "@/subjects/ids";

/** The subject's sample test ("ნიმუში"), at the top of its section: read-only, with Preview / Print / Use as template. */
export function SampleCard({ subjectId }: { subjectId: SubjectId }) {
  const t = useT();
  const makeCopy = useUseAsTemplate();
  const sample = sampleFor(subjectId);
  const questions = sample.questions.filter((q) => !isTextBlock(q)).length;

  return (
    <article
      className="relative flex h-full flex-col rounded-2xl border border-dashed border-primary-soft-border bg-primary-soft/40 shadow-xs"
      data-sample-card={subjectId}
    >
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <SubjectIcon id={subjectId} className="p-2.5" />
          <div className="min-w-0 flex-1 pt-0.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {t("sample.badge")}
            </span>
            <h3 className="mt-1.5 text-[17px] leading-snug font-semibold text-foreground">
              <Link href={`/editor/${sample.id}`} className="line-clamp-2 rounded hover:underline">
                {sample.title}
              </Link>
            </h3>
          </div>
        </div>
        <p className="mt-3 text-sm leading-snug text-soft-foreground">{t("sample.cardText")}</p>
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-soft-foreground">
          <div className="flex items-center gap-1.5">
            <ListOrdered className="size-4 text-muted-foreground" aria-hidden="true" />
            <dt className="sr-only">{t("questions.heading")}</dt>
            <dd>{t("home.questionCount", { count: questions })}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="size-4 text-muted-foreground" aria-hidden="true" />
            <dt className="sr-only">{t("questions.points")}</dt>
            <dd>{t("home.totalPoints", { points: formatPoints(totalPoints(sample.questions)) })}</dd>
          </div>
          {sample.grade && <dd className="rounded-md bg-card px-2 py-0.5 text-[13px] font-medium">{sample.grade}</dd>}
        </dl>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-primary-soft-border px-4 py-3">
        <button type="button" className={buttonVariants({ variant: "default", size: "sm" })} onClick={() => void makeCopy(sample)} data-use-template="">
          <Copy aria-hidden="true" />
          {t("sample.useTemplate")}
        </button>
        <Link href={`/print/${sample.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Eye aria-hidden="true" />
          {t("sample.preview")}
        </Link>
        <Link href={`/print/${sample.id}?print=1`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <Printer aria-hidden="true" />
          {t("sample.print")}
        </Link>
      </div>
    </article>
  );
}
