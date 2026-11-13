"use client";

import { Clock, Copy, FileText, ListOrdered, MoreHorizontal, Pencil, Printer, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage, useT } from "@/i18n/language";
import { formatDateTime } from "@/lib/format";
import { formatPoints, totalPoints } from "@/lib/questions";
import { deleteTest, duplicateTest, restoreTest } from "@/lib/storage/testsRepository";
import type { Test } from "@/lib/storage/types";

/** One test in the "My tests" grid. Clicking the card opens the editor. */
export function TestCard({ test }: { test: Test }) {
  const t = useT();
  const confirm = useConfirm();
  const language = useLanguage();
  const router = useRouter();
  const title = test.title || t("test.untitled");
  const editUrl = `/editor/${test.id}`;
  const printUrl = `/print/${test.id}`;
  const tags = [test.subject, test.grade].filter(Boolean);

  function handleDuplicate() {
    duplicateTest(test.id, test.title ? t("test.copyTitle", { title: test.title }) : "");
    toast.success(t("toast.duplicated"));
  }

  async function handleDelete() {
    const ok = await confirm({
      title: t("home.delete"),
      message: t("home.deleteConfirm", { title }),
      confirmLabel: t("dialog.delete"),
      danger: true,
    });
    if (!ok) return;
    deleteTest(test.id);
    toast(t("toast.testDeleted", { title }), {
      action: { label: t("toast.undo"), onClick: () => restoreTest(test) },
    });
  }

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border bg-card shadow-sm transition-[border-color,box-shadow,translate] duration-200 ease-out-soft hover:border-primary-soft-border hover:shadow-md motion-safe:hover:-translate-y-0.5">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary-soft p-2.5 text-brand transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-[17px] leading-snug font-semibold text-foreground">
              {/* The ::after layer stretches this link over the whole card. */}
              <Link href={editUrl} className="line-clamp-2 rounded after:absolute after:inset-0 after:rounded-2xl">
                {title}
              </Link>
            </h2>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-[13px] font-medium text-soft-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* modal={false}: the "Delete" dialog opens from this menu; a modal menu
              and a dialog at once can leave the page unclickable (a Radix quirk). */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              aria-label={t("home.more")}
              className="relative z-10 -mt-1 -mr-2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent pointer-coarse:p-3"
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-60 [&_[role=menuitem]]:whitespace-nowrap">
              <DropdownMenuItem onSelect={() => router.push(editUrl)}>
                <Pencil aria-hidden="true" />
                {t("home.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleDuplicate}>
                <Copy aria-hidden="true" />
                {t("home.duplicateLabel")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push(printUrl)}>
                <Printer aria-hidden="true" />
                {t("home.print")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => void handleDelete()}>
                <Trash2 aria-hidden="true" />
                {t("home.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <dl className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-soft-foreground">
          <div className="flex items-center gap-1.5">
            <ListOrdered className="size-4 text-muted-foreground" aria-hidden="true" />
            <dt className="sr-only">{t("questions.heading")}</dt>
            <dd>{t("home.questionCount", { count: test.questions.length })}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="size-4 text-muted-foreground" aria-hidden="true" />
            <dt className="sr-only">{t("questions.points")}</dt>
            <dd>{t("home.totalPoints", { points: formatPoints(totalPoints(test.questions)) })}</dd>
          </div>
        </dl>
        <p className="mt-auto flex items-center gap-1.5 pt-3 text-sm text-muted-foreground">
          <Clock className="size-4" aria-hidden="true" />
          {t("home.updatedAt", { date: formatDateTime(test.updatedAt, language) })}
        </p>
      </div>

      <div className="flex items-center gap-2 border-t px-4 py-3">
        <Link href={editUrl} className={buttonVariants({ variant: "soft", size: "sm", className: "relative z-10" })}>
          <Pencil aria-hidden="true" />
          {t("home.edit")}
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={printUrl}
              aria-label={t("home.print")}
              className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "relative z-10 ml-auto" })}
            >
              <Printer aria-hidden="true" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>{t("home.print")}</TooltipContent>
        </Tooltip>
      </div>
    </article>
  );
}
