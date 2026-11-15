"use client";

/**
 * /billing/success and /billing/failed — where the teacher lands after the
 * bank page. The address alone proves nothing: the success page asks OUR
 * server whether the provider's webhook has confirmed the payment.
 */
import { CircleCheck, CircleX, Hourglass, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { PageBackdrop } from "@/components/PageBackdrop";
import { PageTransition } from "@/components/PageTransition";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePlan } from "@/features/plans/PlanProvider";
import { useLanguage, useT } from "@/i18n/language";
import { formatDayOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TestModeBanner } from "./TestModeBanner";
import { useBilling } from "./useBilling";

const CHECK_EVERY_MS = 1500;
const GIVE_UP_AFTER = 20; // checks: about half a minute

function Shell({ icon, title, text, children, state }: { icon: ReactNode; title: string; text: string; children?: ReactNode; state: string }) {
  return (
    <PageTransition className="relative mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <PageBackdrop className="h-72 opacity-60" />
      <TestModeBanner />
      <div className="mt-5 rounded-2xl border bg-card p-7 text-center shadow-sm" data-billing-result={state}>
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">{icon}</div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">{text}</p>
        {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
      </div>
    </PageTransition>
  );
}

function SignInFirst() {
  const t = useT();
  return (
    <Shell state="signed-out" icon={<Hourglass className="size-7 text-muted-foreground" aria-hidden="true" />} title={t("billing.signInNeeded")} text="">
      <Link href="/signin?next=/settings" className={buttonVariants()}>
        {t("billing.signIn")}
      </Link>
    </Shell>
  );
}

export function BillingSuccessView() {
  const t = useT();
  const language = useLanguage();
  const router = useRouter();
  const order = useSearchParams().get("order") ?? "";
  const { status } = useAuth();
  const { refresh: refreshPlan } = usePlan();
  const { summary, refresh } = useBilling();
  const [checks, setChecks] = useState(0);

  const payment = summary?.payments.find((p) => p.order_id === order) ?? null;
  // Without an order in the address: the newest paid payment, if any.
  const shown = payment ?? (order ? null : (summary?.payments.find((p) => p.status === "paid") ?? null));
  const paid = shown?.status === "paid";
  const failed = payment?.status === "failed";
  const waiting = !paid && !failed && checks < GIVE_UP_AFTER;

  useEffect(() => {
    if (!waiting || status !== "signed-in") return;
    const timer = setTimeout(() => {
      void refresh().then(() => setChecks((n) => n + 1));
    }, CHECK_EVERY_MS);
    return () => clearTimeout(timer);
  }, [waiting, status, checks, refresh]);

  useEffect(() => {
    if (paid) refreshPlan();
  }, [paid, refreshPlan]);
  useEffect(() => {
    if (failed) router.replace(`/billing/failed?order=${encodeURIComponent(order)}`);
  }, [failed, order, router]);

  if (status === "signed-out" || status === "unconfigured") return <SignInFirst />;
  if (paid && shown) {
    return (
      <Shell state="paid" icon={<CircleCheck className="size-8 text-success" aria-hidden="true" />} title={t("billing.success.title")} text={t("billing.success.text", { date: formatDayOf(shown.period_end ?? "", language) })}>
        <Link href="/tests" className={buttonVariants()}>
          {t("billing.success.toTests")}
        </Link>
        <Link href={`/billing/receipt/${shown.id}`} className={buttonVariants({ variant: "outline" })} data-receipt-link="">
          {t("billing.success.seeReceipt")}
        </Link>
      </Shell>
    );
  }
  if (waiting || failed) {
    return <Shell state="waiting" icon={<Loader2 className="size-7 animate-spin text-brand" aria-hidden="true" />} title={t("billing.success.waitingTitle")} text={t("billing.success.waitingText")} />;
  }
  return (
    <Shell state="slow" icon={<Hourglass className="size-7 text-muted-foreground" aria-hidden="true" />} title={t("billing.success.slowTitle")} text={t("billing.success.slowText")}>
      <Link href="/settings#plan" className={buttonVariants()}>
        {t("billing.success.myPlan")}
      </Link>
    </Shell>
  );
}

/** Our own short codes for why a payment failed → a helpful sentence. */
function reasonKey(reason: string): "declined" | "threeDs" | "other" {
  const text = reason.toLowerCase();
  if (/3-?d|secure|authenticat/.test(text)) return "threeDs";
  if (/declin|insufficient|reject|limit/.test(text)) return "declined";
  return "other";
}

export function BillingFailedView() {
  const t = useT();
  const order = useSearchParams().get("order") ?? "";
  const { summary } = useBilling();
  const payment = summary?.payments.find((p) => p.order_id === order);
  const reason = reasonKey(payment?.failure_reason ?? "");
  return (
    <Shell state="failed" icon={<CircleX className="size-8 text-destructive-text" aria-hidden="true" />} title={t("billing.failed.title")} text={t("billing.failed.text")}>
      <p className={cn("w-full text-[15px] text-soft-foreground")} data-failure-reason={reason}>
        {t(`billing.failed.reason.${reason}`)}
      </p>
      <Link href="/pricing" className={buttonVariants()}>
        {t("billing.failed.retry")}
      </Link>
      <Link href="/tests" className={buttonVariants({ variant: "ghost" })}>
        {t("billing.success.toTests")}
      </Link>
    </Shell>
  );
}
