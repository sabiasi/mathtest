"use client";

/**
 * /billing/receipt/[id] — a simple receipt the teacher can print or save as
 * PDF with the browser. Always on white "paper". The seller's details come
 * from ONE place: lib/payments/seller.ts (empty ones are clearly marked).
 */
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { useLanguage, useT } from "@/i18n/language";
import { formatDayOf } from "@/lib/format";
import { SELLER, SELLER_FIELDS } from "@/lib/payments/seller";
import { receiptLabel } from "@/lib/payments/summary";
import { BRAND } from "@/lib/plans/plans";
import { gel } from "./BillingSection";
import { useBilling } from "./useBilling";

export function ReceiptView() {
  const t = useT();
  const language = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { status } = useAuth();
  const { summary } = useBilling();
  const payment = summary?.payments.find((p) => p.id === id && p.receipt_number !== null) ?? null;
  const day = (iso: string | null) => (iso ? formatDayOf(iso, language) : "");

  const back = (
    <Link href="/settings#plan" className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-muted-foreground hover:text-foreground print:hidden">
      <ArrowLeft className="size-4" aria-hidden="true" />
      {t("receipt.back")}
    </Link>
  );

  if (status === "loading" || (status === "signed-in" && !summary)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (!payment) {
    return (
      <PageTransition className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {back}
        <p role="alert" className="mt-6 rounded-xl border bg-card px-4 py-3 text-[15px]" data-receipt="missing">
          {status === "signed-in" ? t("receipt.notFound") : t("billing.signInNeeded")}
        </p>
      </PageTransition>
    );
  }

  const profile = summary?.profile;
  const plan = t(`plan.${payment.plan}`);
  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        {back}
        <Button variant="outline" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          {t("receipt.print")}
        </Button>
      </div>

      <article className="paper mt-5 rounded-2xl border p-7 text-[15px] shadow-sm sm:p-9 print:mt-0 print:rounded-none print:border-0 print:shadow-none" data-receipt={payment.status}>
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-300 pb-5">
          <div>
            <p className="text-lg font-bold">{BRAND.name}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight" data-receipt-number="">
              {t("receipt.title", { number: receiptLabel(payment.receipt_number) })}
            </h1>
          </div>
          <dl className="text-right text-sm">
            <dt className="text-neutral-500">{t("receipt.date")}</dt>
            <dd className="font-semibold">{day(payment.paid_at ?? payment.created_at)}</dd>
          </dl>
        </header>

        {summary?.testMode && <p className="mt-4 rounded-lg border border-dashed border-neutral-400 px-3 py-2 text-sm font-semibold">{t("receipt.testNote")}</p>}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <section>
            <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">{t("receipt.seller")}</h2>
            <dl className="mt-2 space-y-1" data-receipt-seller="">
              {SELLER_FIELDS.map((field) => (
                <div key={field}>
                  <dt className="inline text-neutral-500">{t(`receipt.${field}`)}: </dt>
                  {SELLER[field] ? (
                    <dd className="inline font-medium">{SELLER[field]}</dd>
                  ) : (
                    <dd className="inline rounded bg-neutral-100 px-1 text-neutral-500 italic" data-seller-todo={field}>
                      [{t("receipt.todo")}]
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">{t("receipt.buyer")}</h2>
            <div className="mt-2 space-y-1">
              {profile?.full_name && <p className="font-medium">{profile.full_name}</p>}
              {profile?.school_name && <p>{profile.school_name}</p>}
              {profile?.email && <p>{profile.email}</p>}
            </div>
          </section>
        </div>

        <table className="mt-7 w-full text-left">
          <thead>
            <tr className="border-b border-neutral-300 text-sm text-neutral-500">
              <th scope="col" className="py-2 font-semibold">{t("receipt.item")}</th>
              <th scope="col" className="py-2 text-right font-semibold">{t("receipt.amount")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-200 align-top">
              <td className="py-3">
                <p className="font-medium">{t("receipt.itemPremium", { plan, period: t(`pricing.period.${payment.billing_period}`) })}</p>
                {payment.period_start && payment.period_end && (
                  <p className="text-sm text-neutral-500">{t("receipt.periodDates", { from: day(payment.period_start), to: day(payment.period_end) })}</p>
                )}
              </td>
              <td className="py-3 text-right whitespace-nowrap">{gel(payment.amount_tetri)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="py-3 font-semibold">{t("receipt.total")}</th>
              <td className="py-3 text-right text-lg font-bold whitespace-nowrap" data-receipt-total="">{gel(payment.amount_tetri)}</td>
            </tr>
          </tfoot>
        </table>

        <dl className="mt-4 grid gap-x-6 gap-y-1 border-t border-neutral-300 pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="inline text-neutral-500">{t("receipt.status")}: </dt>
            <dd className="inline font-medium">{t(`billing.status.${payment.status}`)}</dd>
          </div>
          {payment.card_last4 && (
            <div>
              <dt className="inline text-neutral-500">{t("receipt.method")}: </dt>
              <dd className="inline font-medium">{t("billing.card", { last4: payment.card_last4 })}</dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="inline text-neutral-500">{t("receipt.orderId")}: </dt>
            <dd className="inline font-mono text-xs break-all">{payment.order_id}</dd>
          </div>
        </dl>
        {payment.status === "refunded" && <p className="mt-3 text-sm font-semibold">{t("receipt.refundedOn", { date: day(payment.refunded_at) })}</p>}
      </article>
    </PageTransition>
  );
}
