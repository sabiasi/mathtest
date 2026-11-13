"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

/**
 * A small button that shows only an icon. `label` is both what screen
 * readers say and the tooltip that appears on hover / keyboard focus.
 */
export function IconButton({
  label,
  tone = "default",
  className,
  children,
  ...props
}: ComponentProps<"button"> & { label: string; tone?: "default" | "danger" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-[color,background-color,transform] duration-150",
            "hover:bg-accent hover:text-foreground motion-safe:active:scale-90 disabled:pointer-events-none disabled:opacity-40 pointer-coarse:p-3",
            tone === "danger" && "hover:bg-destructive-soft hover:text-destructive-text",
            className,
          )}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
