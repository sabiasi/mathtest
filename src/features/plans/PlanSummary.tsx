"use client";

import { Crown, Eye, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTeachingSubjects } from "@/features/subjects/TeachingSubjectsProvider";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage, useT } from "@/i18n/language";
import { formatDayOf, formatSize } from "@/lib/format";
import { ONLINE_PAYMENTS, PLAN_PREVIEW } from "@/lib/plans/plans";
import { loadImageStorage, setPlanPreview, type ImageStorage } from "@/lib/plans/subscription";
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
      {PLAN_PREVIEW && (plan !== "free" || entitlements.previewOf) && <PlanPreview />}
    </div>
  );
}

/** Switches "view the site as Free" on / off (database function set_plan_preview; it can only lower the plan). */
function usePlanPreviewSwitch() {
  const t = useT();
  const { entitlements, refresh } = usePlan();
  const subjects = useTeachingSubjects();
  const [busy, setBusy] = useState(false);

  async function change(free: boolean) {
    setBusy(true);
    try {
      await setPlanPreview(getSupabase(), free);
      refresh();
      subjects.refresh();
      toast.success(t(free ? "plan.previewStarted" : "plan.previewEnded"));
    } catch (error) {
      console.error("MathTest: could not change the plan preview", error);
      toast.error(t("plan.previewError"));
    } finally {
      setBusy(false);
    }
  }
  return { real: entitlements.previewOf, busy, change };
}

/** Settings → My plan: "View as Free" / "Back to Premium". */
function PlanPreview() {
  const t = useT();
  const { real, busy, change } = usePlanPreviewSwitch();
  return (
    <div className="rounded-xl border border-dashed bg-muted/40 p-4" data-plan-preview={real ? "on" : "off"}>
      <p className="font-semibold">{t("plan.previewTitle")}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {real ? t("plan.previewActive", { plan: t(`plan.${real.plan}`) }) : t("plan.previewText")}
      </p>
      <Button className="mt-3" variant={real ? "default" : "outline"} disabled={busy} onClick={() => void change(!real)}>
        {real ? <Undo2 className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        {real ? t("plan.previewOff", { plan: t(`plan.${real.plan}`) }) : t("plan.previewOn")}
      </Button>
    </div>
  );
}

/** A small reminder on "My tests" while previewing Free, with the way back. */
export function PlanPreviewBar({ className }: { className?: string }) {
  const t = useT();
  const { real, busy, change } = usePlanPreviewSwitch();
  if (!real) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-dashed bg-muted/40 px-4 py-2.5 text-sm", className)} data-plan-preview-bar="">
      <Eye className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="text-soft-foreground">{t("plan.previewStarted")}</span>
      <Button size="sm" className="ml-auto" disabled={busy} onClick={() => void change(false)}>
        <Undo2 className="size-4" aria-hidden="true" />
        {t("plan.previewOff", { plan: t(`plan.${real.plan}`) })}
      </Button>
    </div>
  );
}
