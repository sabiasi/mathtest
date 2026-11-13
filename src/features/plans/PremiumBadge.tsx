"use client";

import { Crown } from "lucide-react";
import { useT } from "@/i18n/language";
import { cn } from "@/lib/utils";

/** A small gold "Premium" label next to a Premium feature. `compact`: only the crown (with a tooltip text for screen readers). */
export function PremiumBadge({ compact = false, className }: { compact?: boolean; className?: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-premium-border bg-premium-soft font-semibold text-premium-text",
        compact ? "p-0.5" : "px-2 py-0.5 text-xs",
        className,
      )}
      title={compact ? t("plan.premium") : undefined}
      data-premium-badge=""
    >
      <Crown className={compact ? "size-3" : "size-3.5"} aria-hidden="true" />
      {compact ? <span className="sr-only">{t("plan.premium")}</span> : t("plan.premium")}
    </span>
  );
}
