"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/features/auth/AuthProvider";
import { useT } from "@/i18n/language";
import type { ThemeChoice } from "@/lib/auth/profile";

const THEMES = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
] as const;

/** Header button: Light / Dark / System (follows the computer's setting). */
export function ThemeSwitcher() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  const { status, updateProfile } = useAuth();

  function change(next: string) {
    if (status === "signed-in") void updateProfile({ theme: next as ThemeChoice });
    const root = document.documentElement;
    const apply = () => {
      // Set the colours right now (next-themes would do it a moment later),
      // so the cross-fade below goes from the old look to the new one.
      const dark = next === "dark" || (next === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
      root.classList.toggle("light", !dark);
      root.style.colorScheme = dark ? "dark" : "light";
      setTheme(next);
    };
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // View Transitions: the browser takes a picture of the old page and
    // smoothly fades it into the new one. Older browsers just switch.
    if (!document.startViewTransition || reduceMotion) apply();
    else document.startViewTransition(apply);
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t("theme.label")}>
              {/* Which icon shows is decided by CSS, so the server and browser agree. */}
              <Sun className="size-[18px] dark:hidden" aria-hidden="true" />
              <Moon className="hidden size-[18px] dark:block" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("theme.label")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-sm font-medium text-muted-foreground">{t("theme.label")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={change}>
          {THEMES.map(({ value, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon className="size-4" aria-hidden="true" />
              {t(`theme.${value}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
