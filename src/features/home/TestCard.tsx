"use client";

import { useTeachingSubjects } from "@/features/subjects/TeachingSubjectsProvider";
import { useGuestTrial } from "@/features/auth/GuestTrial";

import type { CSSProperties } from "react";
import { Check, Clock, Copy, Folder, FolderInput, ListOrdered, MoreHorizontal, Pencil, Printer, Star, Trash2 } from "lucide-react";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SubjectIcon } from "@/features/subjects/SubjectPicker";
import { useLanguage, useT } from "@/i18n/language";
import { formatDateTime } from "@/lib/format";
import { formatPoints, totalPoints } from "@/lib/questions";
import { deleteTest, duplicateTest, restoreTest, setTestFolder } from "@/lib/storage/testsRepository";
import type { Test } from "@/lib/storage/types";

/** What a dragged test card carries (dropped on a folder on "My tests"). */
export const TEST_DRAG_TYPE = "application/x-mathtest-test";

/**
 * One test in the "My tests" grid. Clicking the card opens the editor.
 * `folders`: the subject's folders, for "Move to folder" (none = no such menu).
 */
export function TestCard({ test, folders }: { test: Test; folders?: string[] }) {
  const t = useT();
  const access = useTeachingSubjects();
  const trial = useGuestTrial();
  const confirm = useConfirm();
  const language = useLanguage();
  const router = useRouter();
  const title = test.title || t("test.untitled");
  const editUrl = `/editor/${test.id}`;
  const printUrl = `/print/${test.id}`;
  const tags = [test.subject || t(`subject.${test.subjectId}`), test.level, test.grade].filter(Boolean);

  function moveTo(folder: string) {
    if (!access.requestSubject(test.subjectId)) return;
    setTestFolder(test.id, folder);
    toast.success(t("home.movedTo", { folder: folder || t("home.folderNone") }));
  }

  async function handleDuplicate() {
    if (!access.requestSubject(test.subjectId)) return;
    // Guests: the trial is one test, so no copies (the sign-up window explains).
    if (!(await trial.request())) return;
    duplicateTest(test.id, test.title ? t("test.copyTitle", { title: test.title }) : "");
    toast.success(t("toast.duplicated"));
  }

  async function handleDelete() {
    if (!access.requestSubject(test.subjectId)) return;
    const ok = await confirm({
      title: t("home.delete"),
      message: t("home.deleteConfirm", { title }),
      confirmLabel: t("dialog.delete"),
      danger: true,
    });
    if (!ok) return;
    deleteTest(test.id);
    toast(t("toast.testDeleted", { title }), {
      action: { label: t("toast.undo"), onClick: () => { if (access.requestSubject(test.subjectId)) restoreTest(test); } },
    });
  }

  return (
    <article
      // Drag the card onto a folder (My tests). The menu below does the same without a mouse.
      draggable={folders !== undefined && access.canEdit(test.subjectId)}
      onDragStart={(e) => {
        e.dataTransfer.setData(TEST_DRAG_TYPE, test.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      data-test-card={test.id}
      // The card lights up in its subject's colour on hover (.accent-card in globals.css).
      style={{ "--accent-color": `var(--subject-${test.subjectId})` } as CSSProperties}
      className="accent-card group flex h-full flex-col rounded-2xl border bg-card shadow-sm"
    >
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          {/* The subject's icon; its name is read out for screen readers. */}
          <span title={t(`subject.${test.subjectId}`)}>
            <SubjectIcon id={test.subjectId} className="p-2.5" />
            <span className="sr-only">{t(`subject.${test.subjectId}`)}</span>
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-[17px] leading-snug font-semibold text-foreground">
              {/* The ::after layer stretches this link over the whole card. */}
              <Link href={editUrl} className="line-clamp-2 rounded after:absolute after:inset-0 after:rounded-2xl">
                {title}
              </Link>
            </h2>
            {!access.canEdit(test.subjectId) && <p className="mt-1 text-sm text-muted-foreground">{t("teaching.readOnly")}</p>}
            {(tags.length > 0 || test.folder) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-[13px] font-medium text-soft-foreground">
                    {tag}
                  </span>
                ))}
                {test.folder && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-0.5 text-[13px] font-medium text-brand" data-folder-tag="">
                    <Folder className="size-3.5" aria-hidden="true" />
                    {test.folder}
                  </span>
                )}
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
                {t(access.canEdit(test.subjectId) ? "home.edit" : "teaching.readOnly")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleDuplicate()}>
                <Copy aria-hidden="true" />
                {t("home.duplicateLabel")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push(printUrl)}>
                <Printer aria-hidden="true" />
                {t("home.print")}
              </DropdownMenuItem>
              {folders !== undefined && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInput aria-hidden="true" />
                    {t("home.moveTo")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="min-w-52">
                    {["", ...folders].map((folder) => (
                      <DropdownMenuItem key={folder || "-"} onSelect={() => moveTo(folder)} data-move-to={folder}>
                        {test.folder === folder ? <Check aria-hidden="true" /> : <Folder aria-hidden="true" />}
                        {folder || t("home.folderNone")}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
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
          {t(access.canEdit(test.subjectId) ? "home.edit" : "teaching.readOnly")}
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
