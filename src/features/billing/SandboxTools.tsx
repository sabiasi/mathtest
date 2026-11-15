"use client";

/**
 * Test tools, shown ONLY with the local pretend database (sandbox): skip
 * days, run the scheduled job, refund, start again — to watch a renewal, a
 * failed payment, the grace period and a plan ending without waiting weeks.
 */
import { Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/language";
import type { BillingSummary } from "@/lib/payments/summary";
import { billingPost } from "./useBilling";

type SentEmail = { kind: string; subject: string; at: string };

export function SandboxTools({ summary, onChange }: { summary: BillingSummary; onChange: () => Promise<void> }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [emails, setEmails] = useState<SentEmail[]>([]);

  const loadEmails = useCallback(async () => {
    const response = await fetch("/api/sandbox", { cache: "no-store" }).catch(() => null);
    if (response?.ok) setEmails(((await response.json()) as { emails: SentEmail[] }).emails);
  }, []);
  // Again whenever the plan data changes: a cancel or a payment may have sent an email.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the list when the tools appear and after changes
    void loadEmails();
  }, [loadEmails, summary]);

  async function run(path: string, body: Record<string, unknown>, message?: (data: Record<string, unknown>) => string) {
    setBusy(true);
    const answer = await billingPost(path, body);
    if (answer.ok) toast.success(message ? message(answer) : t("sandbox.done"));
    else toast.error(t(`billing.error.${answer.error}`));
    await onChange();
    await loadEmails();
    setBusy(false);
  }
  const lastPaid = summary.payments.find((payment) => payment.status === "paid");

  return (
    <div className="rounded-xl border border-dashed bg-muted/40 p-4" data-sandbox-tools="">
      <p className="flex items-center gap-2 font-semibold">
        <Wrench className="size-4" aria-hidden="true" />
        {t("sandbox.title")}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("sandbox.text")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[1, 2, 7, 31].map((days) => (
          <Button key={days} size="sm" variant="outline" disabled={busy} onClick={() => void run("/api/sandbox", { action: "skipDays", days })} data-sandbox-skip={days}>
            {t("sandbox.skip", { days })}
          </Button>
        ))}
        <Button
          size="sm"
          disabled={busy}
          data-sandbox-job=""
          onClick={() => void run("/api/sandbox", { action: "runJob" }, (d) => t("sandbox.jobDone", { renewed: Number(d.renewed ?? 0), failed: Number(d.failed ?? 0), emails: Number(d.emails ?? 0) }))}
        >
          {t("sandbox.runJob")}
        </Button>
        {lastPaid && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("/api/billing/mock/pay", { action: "refund", order: lastPaid.order_id })} data-sandbox-refund="">
            {t("sandbox.refund")}
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run("/api/sandbox", { action: "reset" })} data-sandbox-reset="">
          {t("sandbox.reset")}
        </Button>
      </div>
      <p className="mt-4 text-sm font-semibold text-soft-foreground">{t("sandbox.emails")}</p>
      {emails.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{t("sandbox.noEmails")}</p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-sm text-soft-foreground" data-sandbox-emails="">
          {emails.map((email, index) => (
            <li key={index} data-email-kind={email.kind}>
              {email.subject}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
