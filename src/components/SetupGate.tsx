"use client";

import { Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useT } from "@/i18n/language";
import { EmptyState } from "./EmptyState";

/** Until .env.local has the Supabase keys, pages that need an account explain that instead of loading forever. */
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
