"use client";

/**
 * Everything the whole app needs, wrapped around every page (see layout.tsx):
 * - ThemeProvider (next-themes): light / dark / system, remembered in localStorage.
 *   It adds a tiny script that sets the theme BEFORE the page is shown, so
 *   there's no flash of the wrong colours.
 * - MotionConfig: animations follow the computer's "reduce motion" setting.
 * - TooltipProvider: shared timing for all tooltips.
 * - ConfirmProvider: our Georgian "Are you sure?" dialogs.
 * - Toaster: where toasts appear.
 */
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
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
        <TooltipProvider>
          <ConfirmProvider>
            {children}
            <Toaster />
          </ConfirmProvider>
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
