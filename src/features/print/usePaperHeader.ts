"use client";

import { useMemo } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePlan } from "@/features/plans/PlanProvider";
import { activePaperHeader, type PaperHeader } from "@/lib/paperHeader";
import { READY } from "@/lib/plans/plans";

/**
 * The teacher's own paper header to print, or null for the default one.
 * - In the PDF server's Chrome: whatever the server handed over (it already
 *   checked the plan).
 * - Otherwise: the header saved in the profile, if the plan has the feature.
 */
export function usePaperHeader(): PaperHeader | null {
  const { profile } = useAuth();
  const { entitlements } = usePlan();
  const injected = typeof window !== "undefined" ? window.__MATHTEST_PRINT__ : undefined;
  const allowed = READY.customHeader && entitlements.features.customHeader;
  const saved = profile?.paper_header;
  return useMemo(() => {
    if (injected) return activePaperHeader(injected.paperHeader, true);
    return activePaperHeader(saved, allowed);
  }, [injected, saved, allowed]);
}
