"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { useT } from "@/i18n/language";
import { cn } from "@/lib/utils";
import { PromoVideoDialog } from "./PromoVideoCard";
import { PROMO_POSTER_SRC } from "./promoVideo";

/**
 * "See how Rapido works" under the My tests heading: a small video thumbnail (poster, ▶, length)
 * + title and a "Video" tag. Opens the same window as the corner card, at any time.
 */
export function PromoVideoButton({ className }: { className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group inline-flex items-center gap-3 rounded-2xl border bg-card p-1.5 pr-4 text-left shadow-sm transition-[box-shadow,border-color] duration-200",
          "hover:border-brand/40 hover:shadow-[var(--glow)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none print:hidden",
          className,
        )}
        data-promo-button=""
      >
        <span className="relative block aspect-video w-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-28">
          {/* eslint-disable-next-line @next/next/no-img-element -- a small static poster, no optimisation needed */}
          <img src={PROMO_POSTER_SRC} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.05]" />
          <span className="absolute inset-0 grid place-items-center bg-black/20">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-white/30 transition-transform duration-200 group-hover:scale-110">
              <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />
            </span>
          </span>
          <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[11px] leading-4 font-medium text-white tabular-nums">
            {t("promo.length")}
          </span>
        </span>
        <span className="min-w-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-brand">
            <Play className="size-3 fill-current" aria-hidden="true" />
            {t("promo.videoTag")}
          </span>
          <span className="mt-1 block font-semibold text-foreground">{t("promo.cardTitle")}</span>
        </span>
      </button>
      <PromoVideoDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
