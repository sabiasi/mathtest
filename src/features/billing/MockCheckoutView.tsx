"use client";

/**
 * /checkout/mock — the pretend bank page of the mock payment provider.
 * The teacher (or the owner, testing) chooses what should happen; our server
 * then sends the same kind of signed message a real bank would.
 */
import { CircleCheck, CircleX, ShieldAlert, TimerReset } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageTransition } from "@/components/PageTransition";
import { buttonVariants } from "@/components/ui/button";
import { useT } from "@/i18n/language";
import type { MockOutcome } from "@/lib/payments/mock";
import { cn } from "@/lib/utils";
import { gel } from "./BillingSection";
import { TestModeBanner } from "./TestModeBanner";
import { billingPost } from "./useBilling";

/** Only for SHOWING the amount; the server checks the session's signature itself. */
function peek(session: string): { amountTetri: number; description: string } | null {
  try {
    const payload = session.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload), (c) => c.charCodeAt(0)))) as { amountTetri?: unknown; description?: unknown };
    return typeof data.amountTetri === "number" ? { amountTetri: data.amountTetri, description: String(data.description ?? "") } : null;
  } catch {
    return null;
  }
}

const CHOICES: { outcome: MockOutcome; Icon: typeof CircleCheck; tone: string }[] = [
  { outcome: "success", Icon: CircleCheck, tone: "text-success" },
  { outcome: "successThenDecline", Icon: TimerReset, tone: "text-premium" },
  { outcome: "declined", Icon: CircleX, tone: "text-destructive-text" },
  { outcome: "threeDsFailed", Icon: ShieldAlert, tone: "text-destructive-text" },
];

export function MockCheckoutView() {
  const t = useT();
  const session = useSearchParams().get("session") ?? "";
  const info = peek(session);
  const [busy, setBusy] = useState(false);

  async function choose(outcome: MockOutcome) {
    setBusy(true);
    const answer = await billingPost<{ redirect: string | null }>("/api/billing/mock/pay", { session, outcome });
    if (answer.ok && answer.redirect) return window.location.assign(answer.redirect);
    setBusy(false);
    toast.error(t(answer.ok ? "mock.error" : answer.error === "invalid" ? "mock.invalid" : "mock.error"));
  }

  return (
    <PageTransition className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <TestModeBanner always />
      <div className="mt-5 rounded-2xl border bg-card p-6 shadow-sm" data-mock-checkout="">
        <h1 className="text-2xl font-bold tracking-tight">{t("mock.title")}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{t("mock.lead")}</p>
        {info ? (
          <>
            <p className="mt-5 flex items-baseline justify-between gap-4 rounded-xl bg-muted/60 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                {t("mock.amount")}
                <span className="block text-soft-foreground">{info.description}</span>
              </span>
              <span className="text-2xl font-bold" data-mock-amount="">{gel(info.amountTetri)}</span>
            </p>
            <div className="mt-5 space-y-2.5">
              {CHOICES.map(({ outcome, Icon, tone }) => (
                <button
                  key={outcome}
                  type="button"
                  disabled={busy}
                  data-mock-outcome={outcome}
                  onClick={() => void choose(outcome)}
                  className="flex w-full items-start gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:border-primary-soft-border hover:bg-primary-soft/40 disabled:opacity-60"
                >
                  <Icon className={cn("mt-0.5 size-5 shrink-0", tone)} aria-hidden="true" />
                  <span>
                    <span className="block font-semibold">{t(`mock.${outcome}`)}</span>
                    <span className="block text-sm text-muted-foreground">{t(`mock.${outcome}Hint`)}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-5">
            <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive-soft px-4 py-3 text-[15px] text-destructive-text">
              {t("mock.invalid")}
            </p>
            <Link href="/pricing" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
              {t("mock.backToPricing")}
            </Link>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
