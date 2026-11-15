"use client";

/**
 * The friendly "this is a Premium feature" window.
 *
 * Opens ONLY when the teacher clicks a Premium feature (never by itself),
 * explains the benefit in a sentence, and offers "See plans" / "Not now".
 * Nothing the teacher is doing is changed or lost: the click simply
 * doesn't happen, and the test stays exactly as it was (autosaved).
 *
 *   const upgrade = useUpgrade();
 *   upgrade("variants");
 */
import { Check, Crown } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/AuthProvider";
import { useT } from "@/i18n/language";
import { BRAND, PLANS, PREMIUM_PRICES_GEL, TRIAL_DAYS } from "@/lib/plans/plans";
import { formatGel } from "@/lib/plans/pricing";
import { useBilling, useStartCheckout } from "@/features/billing/useBilling";

/** Why the window opened: picks the title and the sentence. */
export type UpgradeReason = "variants" | "images" | "footer" | "subjects" | "ai" | "header" | "templates" | "bank" | "docx";

const UpgradeContext = createContext<((reason: UpgradeReason) => void) | null>(null);

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<UpgradeReason | null>(null);
  const open = useCallback((next: UpgradeReason) => setReason(next), []);
  return (
    <UpgradeContext.Provider value={open}>
      {children}
      <UpgradeDialog reason={reason} onClose={() => setReason(null)} />
    </UpgradeContext.Provider>
  );
}

export function useUpgrade(): (reason: UpgradeReason) => void {
  const value = useContext(UpgradeContext);
  if (!value) throw new Error("useUpgrade must be used inside <UpgradeProvider>");
  return value;
}

function UpgradeDialog({ reason, onClose }: { reason: UpgradeReason | null; onClose: () => void }) {
  const t = useT();
  const { guest } = useAuth();
  // Asked only while the window is open. Payments on → the window can lead straight to the payment page.
  const { summary: billing } = useBilling(reason !== null && !guest);
  const startCheckout = useStartCheckout();
  const [buying, setBuying] = useState(false);
  const canBuy = !guest && Boolean(billing?.enabled) && billing?.subscription?.status !== "active";
  async function buy() {
    setBuying(true);
    if (!(await startCheckout("month"))) setBuying(false);
  }
  const free = PLANS.free.limits;
  const premium = PLANS.premium.limits;
  const values = {
    free: free.maxVariants,
    premium: premium.maxVariants,
    freeMb: free.imageStorageMb,
    premiumGb: Math.round(premium.imageStorageMb / 1024),
    freeAi: free.aiGenerationsPerMonth,
    freeTemplates: String(free.templates),
    premiumAi: premium.aiGenerationsPerMonth,
    name: BRAND.name,
    days: TRIAL_DAYS,
  };
  const benefits = [t("upgrade.benefitVariants", values), t("upgrade.benefitFooter", values), t("upgrade.benefitImages", values)];

  return (
    <Dialog open={reason !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent closeLabel={t("dialog.close")} className="sm:max-w-md" data-upgrade-dialog="">
        {reason && (
          <>
            <div className="flex items-start gap-4">
              <span className="inline-flex shrink-0 rounded-xl border border-premium-border bg-premium-soft p-2.5 text-premium-text">
                <Crown className="size-6" aria-hidden="true" />
              </span>
              <div>
                <DialogTitle>{t(`upgrade.${reason}.title`, values)}</DialogTitle>
                <DialogDescription>{t(`upgrade.${reason}.text`, values)}</DialogDescription>
              </div>
            </div>

            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-sm font-semibold text-soft-foreground">{t("upgrade.alsoTitle")}</p>
              <ul className="mt-2 space-y-1.5 text-[15px]">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">{t("upgrade.safe")}</p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={onClose}>
                {t("upgrade.notNow")}
              </Button>
              {guest ? (
                <Link href="/signup" onClick={onClose} className={buttonVariants()}>
                  {t("upgrade.signUp", values)}
                </Link>
              ) : (
                <>
                  <Link href="/pricing" onClick={onClose} className={buttonVariants({ variant: canBuy ? "outline" : "default" })}>
                    {t("upgrade.seePlans")}
                  </Link>
                  {canBuy && (
                    <Button disabled={buying} onClick={() => void buy()} data-upgrade-buy="">
                      <Crown aria-hidden="true" />
                      {t("upgrade.buy", { price: formatGel(PREMIUM_PRICES_GEL.month) })}
                    </Button>
                  )}
                </>
              )}
            </div>
            {guest && <p className="-mt-2 text-right text-sm text-muted-foreground">{t("upgrade.trialNote", values)}</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
