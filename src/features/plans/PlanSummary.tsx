"use client";

import { Crown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage, useT } from "@/i18n/language";
import { formatDayOf, formatSize } from "@/lib/format";
import { ONLINE_PAYMENTS } from "@/lib/plans/plans";
import { loadImageStorage, type ImageStorage } from "@/lib/plans/subscription";
import { getSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { usePlan } from "./PlanProvider";

/** Settings → "My plan": which plan, until when, and how much picture space is used. */
export function PlanSummary() {
  const t = useT();
  const language = useLanguage();
  const { entitlements, ready } = usePlan();
  const [storage, setStorage] = useState<ImageStorage | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadImageStorage(getSupabase())
      .then((value) => !cancelled && setStorage(value))
      .catch(() => undefined); // the database function may not exist yet: just don't show the bar
    return () => {
      cancelled = true;
    };
  }, [entitlements.plan]);

  if (!ready) return <Skeleton className="h-28" />;

  const { plan, state, trialDaysLeft, renewsAt, endsAt } = entitlements;
  const date = (iso: string | null) => (iso ? formatDayOf(iso, language) : "");
  let text: string;
  if (state === "trial") text = t("plan.trialText", { days: trialDaysLeft ?? 0, date: date(endsAt) });
  else if (state === "ending") text = t("plan.endingText", { date: date(endsAt) });
  else if (state === "grace") text = t("plan.graceText", { date: date(endsAt) });
  else if (state === "active") text = renewsAt ? t("plan.activeText", { date: date(renewsAt) }) : t("plan.activeNoEnd");
  else text = t("plan.freeText");

  const percent = storage && storage.limit > 0 ? Math.min(100, (storage.used / storage.limit) * 100) : 0;

  return (
    <div className="space-y-5" data-plan-summary={plan}>
      <div>
        <p className="flex flex-wrap items-center gap-2 text-xl font-bold">
          {plan !== "free" && <Crown className="size-5 text-premium" aria-hidden="true" />}
          {t(`plan.${plan}`)}
          {state !== "free" && state !== "guest" && (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-sm font-semibold",
                state === "grace" ? "bg-warning-soft text-warning-text" : "bg-premium-soft text-premium-text",
              )}
            >
              {t(`plan.state.${state}`)}
            </span>
          )}
        </p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
      </div>

      {storage && storage.limit > 0 && (
        <div>
          <p className="flex justify-between text-sm">
            <span className="font-medium text-soft-foreground">{t("plan.images")}</span>
            <span className="text-muted-foreground">
              {t("plan.imagesUsage", { used: formatSize(storage.used), limit: formatSize(storage.limit) })}
            </span>
          </p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className={cn("h-full rounded-full", percent >= 90 ? "bg-destructive" : "bg-primary")}
              style={{ width: `${Math.max(percent, storage.used > 0 ? 2 : 0)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/pricing" className={buttonVariants({ variant: plan === "free" ? "default" : "outline" })}>
          {t("plan.seePlans")}
        </Link>
      </div>
      {!ONLINE_PAYMENTS && <p className="text-sm text-muted-foreground">{t("plan.billingSoon")}</p>}
    </div>
  );
}
