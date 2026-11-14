"use client";

/**
 * Guest mode: one free trial test, then registration (lib/guestTrial.ts).
 *
 * `useGuestTrial().request()` is called BEFORE a guest creates, copies or
 * duplicates a test. The first time it says yes (and remembers the trial);
 * after that it opens the friendly "sign up free" window and says no.
 * Signed-in teachers (and a site without accounts set up) always get yes.
 * Samples are free to look at: opening one never asks.
 */
import { Check, Gift } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n/language";
import { guestMayCreate, markTrialUsed } from "@/lib/guestTrial";
import { listTests } from "@/lib/storage/testsRepository";
import { getSupabase } from "@/lib/supabase/client";
import { callbackUrl, GoogleButton } from "./AuthParts";
import { useAuth } from "./AuthProvider";

type GuestTrial = {
  /** True for a signed-out visitor on a site with accounts: the one-test trial applies. */
  limited: boolean;
  /**
   * Call right before creating a test: true = go ahead (for a guest this
   * starts the trial: server check + "trial used" saved); false = the
   * sign-up window is shown instead.
   */
  request: () => Promise<boolean>;
  /** Only looks (e.g. before opening "which subject?"): false = the sign-up window is shown. Starts nothing. */
  check: () => Promise<boolean>;
  /** Shows the sign-up window. */
  show: () => void;
};

const Context = createContext<GuestTrial | null>(null);
const AFTER_SIGN_UP = "/tests";

export function GuestTrialProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  const limited = status === "signed-out";

  const check = useCallback(async () => {
    if (status === "loading") return false; // decided in a moment; a second click works
    if (status !== "signed-out") return true;
    if (await guestMayCreate(listTests().length)) return true;
    setOpen(true);
    return false;
  }, [status]);

  const request = useCallback(async () => {
    if (status !== "signed-out") return status !== "loading";
    if (!(await check())) return false;
    // The light server check (per IP and day). A network problem doesn't block anyone.
    try {
      const response = await fetch("/api/guest-trial", { method: "POST" });
      if (response.status === 429) {
        setOpen(true);
        return false;
      }
    } catch {
      // offline or no server: the browser's own flag still applies
    }
    await markTrialUsed();
    return true;
  }, [status, check]);

  const show = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ limited, request, check, show }), [limited, request, check, show]);

  return (
    <Context.Provider value={value}>
      {children}
      {limited && <TrialUsedDialog open={open} onOpenChange={setOpen} />}
    </Context.Provider>
  );
}

export function useGuestTrial(): GuestTrial {
  const value = useContext(Context);
  if (!value) throw new Error("useGuestTrial must be used inside <GuestTrialProvider>");
  return value;
}

/** "You've used your free trial": sign up / sign in / Google, never an error. */
function TrialUsedDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  // After signing up: "My tests", where the trial test appears (it moves into the account by itself).
  const next = encodeURIComponent(AFTER_SIGN_UP);
  const benefits = [t("trial.benefitUnlimited"), t("trial.benefitSaved"), t("trial.benefitDevices")];

  async function google() {
    setBusy(true);
    const { error } = await getSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl({ next: AFTER_SIGN_UP }) } });
    if (error) setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("dialog.close")} className="sm:max-w-md" data-trial-dialog="">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex rounded-2xl border border-primary-soft-border bg-primary-soft p-3.5 text-brand shadow-[0_10px_30px_-12px_var(--glow)]">
            <Gift className="size-7" aria-hidden="true" />
          </span>
          <DialogTitle className="mt-4 text-xl">{t("trial.title")}</DialogTitle>
          <DialogDescription className="mt-2 text-[15px] leading-relaxed">{t("trial.text")}</DialogDescription>
        </div>

        <ul className="space-y-2 rounded-xl bg-muted/60 p-4 text-[15px]">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              {benefit}
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          <Link href={`/signup?next=${next}`} onClick={() => onOpenChange(false)} className={buttonVariants({ size: "lg", className: "w-full" })} data-trial-signup="">
            {t("trial.signUp")}
          </Link>
          <GoogleButton onClick={() => void google()} busy={busy} />
          <p className="text-center text-sm text-muted-foreground">
            {t("trial.haveAccount")}{" "}
            <Link href={`/signin?next=${next}`} onClick={() => onOpenChange(false)} className="font-semibold text-brand underline-offset-2 hover:underline" data-trial-signin="">
              {t("trial.signIn")}
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The small note in the editor while a guest works on their trial test. */
export function TrialNote() {
  const t = useT();
  const { limited } = useGuestTrial();
  if (!limited) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground print:hidden" data-trial-note="">
      <Gift className="size-4 shrink-0 text-brand" aria-hidden="true" />
      <span>{t("trial.note")}</span>
      <Link href={`/signup?next=${encodeURIComponent(AFTER_SIGN_UP)}`} className="font-semibold text-brand underline-offset-2 hover:underline">
        {t("trial.noteSignUp")}
      </Link>
    </p>
  );
}
