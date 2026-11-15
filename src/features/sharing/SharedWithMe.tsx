"use client";

/** "Shared with me" on My tests: colleagues' tests, kept apart from the teacher's own. */
import { Copy, Eye, Pencil, Printer, Users, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useAuth } from "@/features/auth/AuthProvider";
import { SubjectIcon } from "@/features/subjects/SubjectPicker";
import { useTeachingSubjects } from "@/features/subjects/TeachingSubjectsProvider";
import { useT } from "@/i18n/language";
import { READY } from "@/lib/plans/plans";
import { leaveSharedTest } from "@/lib/sharing/sharesStore";
import { forgetShared, parseSharedKey, type SharedTest } from "@/lib/storage/testsRepository";
import { useSharedTests } from "@/lib/storage/useTests";
import { useCopyShared } from "./useCopyShared";

export function SharedWithMe({ className }: { className?: string }) {
  const t = useT();
  const { status } = useAuth();
  const shared = useSharedTests();
  if (!READY.sharing || status !== "signed-in" || !shared?.length) return null;
  return (
    <section className={className} data-shared-with-me="">
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Users className="size-5 text-brand" aria-hidden="true" />
          {t("shared.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("shared.lead")}</p>
        <ul className="mt-4 divide-y">
          {shared.map((entry) => <SharedRow key={entry.key} entry={entry} />)}
        </ul>
      </div>
    </section>
  );
}

function SharedRow({ entry }: { entry: SharedTest }) {
  const t = useT();
  const confirm = useConfirm();
  const access = useTeachingSubjects();
  const { copy, busy } = useCopyShared();
  const title = entry.test.title || t("test.untitled");
  const href = encodeURIComponent(entry.key);
  // Editing also needs the subject to be one I teach (the database checks the same).
  const canEdit = entry.role === "edit" && access.canEdit(entry.test.subjectId);

  async function leave() {
    const ids = parseSharedKey(entry.key);
    if (!ids || !(await confirm({ title: t("shared.leaveTitle"), message: t("shared.leaveText", { title }), confirmLabel: t("shared.leave") }))) return;
    if (await leaveSharedTest(ids.ownerId, ids.testId)) {
      forgetShared(entry.key);
      toast.success(t("shared.left"));
    } else toast.error(t("share.error.failed"));
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-3" data-shared-test={entry.key} data-shared-role={entry.role}>
      <SubjectIcon id={entry.test.subjectId} />
      <div className="min-w-48 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">
          {entry.ownerName ? t("shared.from", { name: entry.ownerName }) : t("shared.fromUnknown")}
          {" · "}
          {t(canEdit ? "shared.canEdit" : "shared.canView")}
        </p>
      </div>
      <Link href={`/editor/${href}`} className={buttonVariants({ variant: "soft", size: "sm" })} data-shared-open="">
        {canEdit ? <Pencil aria-hidden="true" /> : <Eye aria-hidden="true" />}
        {t("shared.open")}
      </Link>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void copy(entry.test)} data-shared-copy="">
        <Copy aria-hidden="true" />
        {t(busy ? "shared.copying" : "shared.copy")}
      </Button>
      <Link href={`/print/${href}`} aria-label={t("home.print")} title={t("home.print")} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
        <Printer aria-hidden="true" />
      </Link>
      <IconButton label={t("shared.leave")} onClick={() => void leave()} data-shared-leave="">
        <X className="size-4" aria-hidden="true" />
      </IconButton>
    </li>
  );
}
