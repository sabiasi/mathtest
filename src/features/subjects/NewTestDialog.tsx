"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n/language";
import type { SubjectId } from "@/subjects/ids";
import { SUBJECTS } from "@/subjects/registry";
import { SubjectIcon } from "./SubjectPicker";

/**
 * "Which subject is this test for?" — one big button per subject.
 * One click creates the test (no extra "OK" step).
 */
export function NewTestDialog({
  open,
  onOpenChange,
  defaultSubject,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Marked as "Default" and focused first (from Settings). */
  defaultSubject: SubjectId | null;
  onPick: (id: SubjectId) => void;
}) {
  const t = useT();
  const defaultButton = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t("dialog.close")}
        className="sm:max-w-xl"
        data-new-test-dialog=""
        onOpenAutoFocus={(event) => {
          if (!defaultButton.current) return;
          event.preventDefault();
          defaultButton.current.focus();
        }}
      >
        <div>
          <DialogTitle>{t("subjects.pickTitle")}</DialogTitle>
          <DialogDescription>{t("subjects.pickText")}</DialogDescription>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {SUBJECTS.map(({ id }) => (
            <button
              key={id}
              ref={id === defaultSubject ? defaultButton : undefined}
              type="button"
              data-subject={id}
              onClick={() => onPick(id)}
              className="group flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-[background-color,border-color,box-shadow,scale] duration-150 hover:border-primary-soft-border hover:bg-primary-soft/50 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-safe:active:scale-[0.98] pointer-coarse:p-4"
            >
              <SubjectIcon id={id} className="p-2.5" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 font-semibold text-foreground">
                  {t(`subject.${id}`)}
                  {id === defaultSubject && (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-brand">{t("subjects.default")}</span>
                  )}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{t(`subjectHint.${id}`)}</span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
