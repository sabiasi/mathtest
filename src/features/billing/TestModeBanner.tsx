"use client";

import { FlaskConical } from "lucide-react";
import { useT } from "@/i18n/language";
import { cn } from "@/lib/utils";
import { useBilling } from "./useBilling";

/** A clear "TEST MODE" strip wherever money is mentioned while no real money can move. */
export function TestModeBanner({ className, always = false }: { className?: string; always?: boolean }) {
  const t = useT();
  const { summary } = useBilling();
  if (!always && !(summary?.enabled && summary.testMode)) return null;
  return (
    <div role="note" data-test-mode="" className={cn("flex items-start gap-3 rounded-xl border border-dashed border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-text", className)}>
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        <b className="font-semibold">{t("billing.testMode.title")}</b> — {t("billing.testMode.text")}
      </p>
    </div>
  );
}
