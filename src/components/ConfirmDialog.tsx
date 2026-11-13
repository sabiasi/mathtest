"use client";

/**
 * A Georgian "Are you sure?" dialog, replacing the browser's window.confirm
 * (whose title says "localhost:3000 says" and whose buttons may be English).
 *
 * Usage:   const confirm = useConfirm();
 *          if (await confirm({ title, message, confirmLabel, danger: true })) { … }
 *
 * Built on shadcn/ui's AlertDialog (Radix): it sits above the page, keeps
 * keyboard focus inside, puts the focus on "Cancel" (the safe choice), closes
 * with Escape, and fades + scales in and out.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useT } from "@/i18n/language";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  /** Text of the safe button (default: "Cancel"). */
  cancelLabel?: string;
  /** Red button, for things that delete. */
  danger?: boolean;
};

type Pending = ConfirmOptions & { resolve: (answer: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [pending, setPending] = useState<Pending | null>(null);
  // Kept separately so the text stays visible while the dialog fades out.
  const [open, setOpen] = useState(false);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
        setOpen(true);
      }),
    [],
  );

  function answer(value: boolean) {
    pending?.resolve(value);
    setPending((p) => (p ? { ...p, resolve: () => {} } : p)); // answer only once
    setOpen(false);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && answer(false)}>
        {pending && (
          <AlertDialogContent data-confirm-dialog="" className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>{pending.title}</AlertDialogTitle>
              <AlertDialogDescription>{pending.message}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => answer(false)}>{pending.cancelLabel ?? t("dialog.cancel")}</AlertDialogCancel>
              <AlertDialogAction variant={pending.danger ? "destructive" : "default"} onClick={() => answer(true)}>
                {pending.confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}
