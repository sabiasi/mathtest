"use client";

/**
 * A Georgian "Are you sure?" dialog, replacing the browser's window.confirm
 * (whose title says "localhost:3000 says" and whose buttons may be English).
 *
 * Usage:   const confirm = useConfirm();
 *          if (await confirm({ title, message, confirmLabel, danger: true })) { … }
 *
 * It's built on the browser's <dialog> element, which already handles the
 * hard parts: it sits above the page, keeps keyboard focus inside, and
 * closes with Escape.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/i18n/language";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  /** Red button, for things that delete. */
  danger?: boolean;
};

type Pending = ConfirmOptions & { resolve: (answer: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  useEffect(() => {
    if (pending && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [pending]);

  function answer(value: boolean) {
    pending?.resolve(value);
    dialogRef.current?.close();
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-title"
        onCancel={(event) => {
          event.preventDefault(); // Escape key: treat as "Cancel"
          answer(false);
        }}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/40"
      >
        {pending && (
          <div className="p-6">
            <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">
              {pending.title}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{pending.message}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                autoFocus // the safe choice is the default
                onClick={() => answer(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800 hover:bg-slate-50"
              >
                {t("dialog.cancel")}
              </button>
              <button
                type="button"
                onClick={() => answer(true)}
                className={`rounded-lg px-4 py-2.5 font-semibold text-white shadow-sm ${
                  pending.danger ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {pending.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}
