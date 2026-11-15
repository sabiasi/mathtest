"use client";

/** Shared pieces of the admin tabs: a window for one change (always with a reason), and the answer → message step. */
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/language";
import type { ApiAnswer } from "@/lib/schools/api";
import { SCHOOL_RESULTS } from "@/features/schools/messages";

/** true = it worked; otherwise a plain message is shown. */
export function useAdminReport() {
  const t = useT();
  return (answer: ApiAnswer<{ result?: string; data?: unknown }>): boolean => {
    if (!answer.ok) {
      toast.error(t(`mySchool.error.${answer.error}`));
      return false;
    }
    const result = answer.body.result;
    if (result === undefined || result === "ok") return true;
    toast.error(SCHOOL_RESULTS.includes(result as (typeof SCHOOL_RESULTS)[number]) ? t(`mySchool.result.${result as (typeof SCHOOL_RESULTS)[number]}`) : t("mySchool.error.failed"));
    return false;
  };
}

/**
 * One change in a window. The reason is required (at least 3 characters):
 * it is stored in the audit log with the change. `onSubmit` returns true when done.
 */
export function ActionDialog({ open, title, text, submitLabel, onClose, onSubmit, children, danger = false }: {
  open: boolean;
  title: string;
  text?: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<boolean>;
  children?: ReactNode;
  danger?: boolean;
}) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 3) return;
    setBusy(true);
    const done = await onSubmit(reason.trim());
    setBusy(false);
    if (done) {
      setReason("");
      onClose();
    }
  }
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={t("dialog.close")} className="sm:max-w-lg" data-admin-dialog="">
        <DialogTitle>{title}</DialogTitle>
        {text && <DialogDescription>{text}</DialogDescription>}
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          {children}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-soft-foreground">{t("admin.reason")}</span>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={2} placeholder={t("admin.reasonPlaceholder")} data-admin-reason="" />
            <span className="mt-1 block text-xs text-muted-foreground">{t("admin.reasonHint")}</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>{t("dialog.cancel")}</Button>
            <Button type="submit" variant={danger ? "destructive" : "default"} disabled={busy || reason.trim().length < 3} data-admin-submit="">{submitLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A small labelled field inside an ActionDialog. */
export function AdminField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-soft-foreground">{label}</span>
      {children}
    </label>
  );
}
