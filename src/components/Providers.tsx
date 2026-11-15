"use client";

/**
 * Everything the whole app needs, wrapped around every page (see layout.tsx):
 * - ThemeProvider (next-themes): light / dark / system, remembered in localStorage.
 *   It adds a tiny script that sets the theme BEFORE the page is shown, so
 *   there's no flash of the wrong colours.
 * - MotionConfig: animations follow the computer's "reduce motion" setting.
 * - TooltipProvider: shared timing for all tooltips.
 * - AuthProvider: who is signed in; loads their tests from the cloud.
 * - PlanProvider: their plan (Free / Premium / School), see usePlan().
 * - UpgradeProvider: the friendly "this is a Premium feature" window.
 * - ConfirmProvider: our Georgian "Are you sure?" dialogs.
 * - GuestTrialProvider: guests get one free trial test, then "sign up free".
 * - ShareProvider: the "share this test" window (useShare()).
 * - ConflictDialog: "someone else changed this test" (load theirs / keep mine).
 * - Toaster: where toasts appear.
 */
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { GuestTrialProvider } from "@/features/auth/GuestTrial";
import { TeachingSubjectsProvider } from "@/features/subjects/TeachingSubjectsProvider";
import { PlanProvider } from "@/features/plans/PlanProvider";
import { UpgradeProvider } from "@/features/plans/UpgradeDialog";
import { ConflictDialog } from "@/features/sharing/ConflictDialog";
import { ShareProvider } from "@/features/sharing/ShareDialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmProvider } from "./ConfirmDialog";

export const THEME_STORAGE_KEY = "mathtest:theme";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
      // Switch all colours at once (the cross-fade is done in ThemeSwitcher).
      disableTransitionOnChange
    >
      <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}>
        <AuthProvider>
          <PlanProvider>
            <TooltipProvider>
              <ConfirmProvider>
                <UpgradeProvider>
                  <TeachingSubjectsProvider>
                    <GuestTrialProvider>
                      <ShareProvider>{children}</ShareProvider>
                    </GuestTrialProvider>
                    <ConflictDialog />
                  </TeachingSubjectsProvider>
                  <Toaster />
                </UpgradeProvider>
              </ConfirmProvider>
            </TooltipProvider>
          </PlanProvider>
        </AuthProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
