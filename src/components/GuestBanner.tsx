"use client";

import { CloudUpload, X } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { buttonVariants } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useAuth } from "@/features/auth/AuthProvider";
import { useT } from "@/i18n/language";
import { cn } from "@/lib/utils";

// "Hide" lasts until the browser tab is closed (sessionStorage), so the
// reminder comes back another day but never nags during one session.
const HIDDEN_KEY = "mathtest:guest-banner-hidden";
const listeners = new Set<() => void>();
let hidden: boolean | null = null;

function isHidden(): boolean {
  if (hidden === null) {
    try {
      hidden = sessionStorage.getItem(HIDDEN_KEY) === "1";
    } catch {
      hidden = false;
    }
  }
  return hidden;
}

function hide() {
  hidden = true;
  try {
    sessionStorage.setItem(HIDDEN_KEY, "1");
  } catch {
    // storage blocked: hidden for this page view only
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * A small, friendly note for guests: "your test is only on this device —
 * sign up free to keep it safe". Never a popup; it can be hidden.
 */
export function GuestBanner({ className }: { className?: string }) {
  const t = useT();
  const { status } = useAuth();
  const isHiddenNow = useSyncExternalStore(subscribe, isHidden, () => true);
  // Only real guests (when accounts are set up, so signing up is possible).
  if (status !== "signed-out" || isHiddenNow) return null;
  return (
    <div className={cn("print:hidden", className)}>
      <div
        role="note"
        data-guest-banner=""
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-primary-soft-border bg-primary-soft/50 py-2 pr-1.5 pl-3 text-sm text-soft-foreground"
      >
        <CloudUpload className="size-5 shrink-0 text-brand" aria-hidden="true" />
        <p className="min-w-48 flex-1">{t("guest.bannerText")}</p>
        <div className="flex items-center gap-1">
          <Link href="/signup" className={buttonVariants({ size: "sm" })}>
            {t("guest.bannerSignUp")}
          </Link>
          <IconButton label={t("guest.bannerHide")} onClick={hide} className="p-1.5">
            <X className="size-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
