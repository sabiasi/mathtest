"use client";

import { Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useT } from "@/i18n/language";
import { EmptyState } from "./EmptyState";

/**
 * Until Supabase is connected (.env / .env.local), pages that need an
 * account (settings) explain that instead of loading forever. Everything
 * else works in guest mode.
 */
export function SetupGate({ children }: { children: ReactNode }) {
  const t = useT();
  const { status } = useAuth();
  if (status !== "unconfigured") return children;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <EmptyState Icon={Settings2} title={t("setup.title")} text={t("setup.text")} />
    </div>
  );
}
