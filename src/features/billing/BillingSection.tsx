"use client";

/**
 * Settings → My plan → payments: the next payment, the card (last 4 digits
 * only), the billing period, cancel / resume, and the receipts.
 */
import { CreditCard, FileText, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { FieldLabel, SegmentedControl } from "@/components/ui/form";
import { usePlan } from "@/features/plans/PlanProvider";
import { useLanguage, useT } from "@/i18n/language";
import { formatDayOf } from "@/lib/format";
import { receiptLabel, type BillingSummary, type PaymentRow } from "@/lib/payments/summary";
import { BILLING_PERIODS, PREMIUM_PRICES_GEL, type BillingPeriod } from "@/lib/plans/plans";
import { formatGel } from "@/lib/plans/pricing";
import { cn } from "@/lib/utils";
import { SandboxTools } from "./SandboxTools";
import { TestModeBanner } from "./TestModeBanner";
import { billingPost, useBilling, useStartCheckout } from "./useBilling";

export const gel = (tetri: number) => `${formatGel(tetri / 100)} ₾`;

export function BillingSection() {
  const t = useT();
  const language = useLanguage();
  const confirm = useConfirm();
  const { entitlements, refresh: refreshPlan } = usePlan();
  const { summary, refresh } = useBilling();
  const startCheckout = useStartCheckout();
  const [busy, setBusy] = useState(false);

  if (!summary) return null;
  const hasHistory = summary.payments.length > 0;
  // Payments are off and there is nothing to show: one quiet line.
  if (!summary.enabled && !hasHistory) return <p className="text-sm text-muted-foreground">{t("plan.billingSoon")}</p>;

  const subscription = summary.subscription;
  const real = entitlements.previewOf?.state ?? entitlements.state;
  const period = subscription?.billing_period ?? null;
  const day = (iso: string | null | undefined) => (iso ? formatDayOf(iso, language) : "");
  const paidPlan = Boolean(subscription?.provider) && (real === "active" || real === "ending" || real === "grace");
  const periodEnd = subscription?.current_period_end ?? null;

  async function reload() {
    refreshPlan();
    await refresh();
  }

  async function act(path: string, body: Record<string, unknown>, done: string) {
    setBusy(true);
    const answer = await billingPost(path, body);
    setBusy(false);
    if (!answer.ok) return void toast.error(t(`billing.error.${answer.error}`));
    toast.success(done);
    await reload();
  }

  async function cancel() {
    const yes = await confirm({
      title: t("billing.cancelTitle"),
      message: t("billing.cancelText", { date: day(periodEnd) }),
      confirmLabel: t("billing.cancelConfirm"),
      cancelLabel: t("billing.cancelKeep"),
      danger: true,
    });
    if (yes) await act("/api/billing/cancel", {}, t("billing.cancelled", { date: day(periodEnd) }));
  }

  async function changePeriod(next: BillingPeriod) {
    if (next === period) return;
    const yes = await confirm({
      title: t("billing.periodConfirmTitle"),
      message: t("billing.periodConfirmText", { date: day(periodEnd), amount: `${formatGel(PREMIUM_PRICES_GEL[next])} ₾`, period: t(`pricing.period.${next}`) }),
      confirmLabel: t("billing.periodConfirm"),
    });
    if (yes) await act("/api/billing/change-plan", { period: next }, t("billing.periodChanged"));
  }

  async function payNow() {
    setBusy(true);
    const started = await startCheckout(period ?? "month");
    if (!started) setBusy(false);
  }

  return (
    <div className="space-y-5 border-t pt-5" data-billing="">
      <TestModeBanner />

      {paidPlan && (
        <div className="space-y-4" data-billing-state={real}>
          {real === "active" && period && periodEnd && (
            <p className="text-[15px] text-soft-foreground" data-billing-next="">
              {t("billing.next", { date: day(periodEnd), amount: `${formatGel(PREMIUM_PRICES_GEL[period])} ₾` })}
            </p>
          )}
          {real === "ending" && <p className="text-[15px] text-soft-foreground">{t("billing.endsOn", { date: day(periodEnd) })}</p>}
          {real === "grace" && (
            <div className="rounded-xl border border-warning-border bg-warning-soft p-4 text-[15px] text-warning-text">
              <p>{t("billing.grace", { date: day(entitlements.previewOf ? subscription?.grace_ends_at : entitlements.endsAt) })}</p>
              {summary.enabled && (
                <Button className="mt-3" disabled={busy} onClick={() => void payNow()} data-billing-pay-now="">
                  <CreditCard aria-hidden="true" />
                  {t("billing.payNow")}
                </Button>
              )}
            </div>
          )}

          {summary.method?.last4 && (
            <p className="flex flex-wrap items-center gap-2 text-[15px]" data-billing-card="">
              <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">{t("billing.card", { last4: summary.method.last4 })}</span>
              {summary.method.brand && <span className="text-muted-foreground uppercase">{summary.method.brand}</span>}
              {summary.method.expiry && <span className="text-muted-foreground">· {t("billing.cardExpiry", { expiry: summary.method.expiry })}</span>}
            </p>
          )}

          {real === "active" && period && summary.enabled && (
            <div>
              <FieldLabel>{t("billing.period")}</FieldLabel>
              {summary.canChangePeriod ? (
                <>
                  <SegmentedControl<BillingPeriod>
                    label={t("billing.period")}
                    value={period}
                    onChange={(next) => void changePeriod(next)}
                    options={BILLING_PERIODS.map((p) => ({ value: p, label: <span className="px-1 text-[15px]">{t(`pricing.period.${p}`)}</span> }))}
                  />
                  <p className="mt-1.5 text-sm text-muted-foreground">{t("billing.periodHint")}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t(`pricing.period.${period}`)} — {t("billing.periodFixed")}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {real === "active" && periodEnd && (
              <Button variant="outline" disabled={busy} onClick={() => void cancel()} data-billing-cancel="">
                {t("billing.cancel")}
              </Button>
            )}
            {real === "ending" && subscription?.cancel_at_period_end && (
              <Button disabled={busy} onClick={() => void act("/api/billing/resume", {}, t("billing.resumed"))} data-billing-resume="">
                <RotateCcw aria-hidden="true" />
                {t("billing.resume")}
              </Button>
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-soft-foreground">{t("billing.receipts")}</h3>
        {hasHistory ? (
          <ul className="mt-2 divide-y rounded-xl border" data-billing-payments="">
            {summary.payments.map((payment) => (
              <PaymentLine key={payment.id} payment={payment} />
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-sm text-muted-foreground">{t("billing.noReceipts")}</p>
        )}
      </div>

      {summary.sandbox && <SandboxTools summary={summary} onChange={reload} />}
    </div>
  );
}

function PaymentLine({ payment }: { payment: PaymentRow }) {
  const t = useT();
  const language = useLanguage();
  const tone = { paid: "bg-success-soft text-success-text", failed: "bg-destructive-soft text-destructive-text", refunded: "bg-muted text-muted-foreground" }[payment.status];
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3.5 py-2.5 text-[15px]" data-payment={payment.status}>
      <span className="min-w-28 text-soft-foreground">{formatDayOf(payment.paid_at ?? payment.created_at, language)}</span>
      <span className="font-medium">{gel(payment.amount_tetri)}</span>
      <span className="text-muted-foreground">{t(`pricing.period.${payment.billing_period}`)}</span>
      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", tone)}>{t(`billing.status.${payment.status}`)}</span>
      {payment.receipt_number !== null && (
        <Link href={`/billing/receipt/${payment.id}`} className="ml-auto inline-flex items-center gap-1.5 rounded text-sm font-medium text-brand hover:underline" data-receipt-link="">
          <FileText className="size-4" aria-hidden="true" />
          {t("billing.receipt")} {receiptLabel(payment.receipt_number)}
        </Link>
      )}
    </li>
  );
}

export type { BillingSummary };
