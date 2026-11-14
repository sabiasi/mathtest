"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useT } from "@/i18n/language";
import { cn } from "@/lib/utils";

/**
 * Two small chevrons in a rounded pill: move an item one place up or down.
 * "Up" is disabled on the first item, "down" on the last. Used for question
 * cards, answer options and the rows of ordering / matching questions.
 * `vertical`: ▲ above ▼ (question cards); otherwise side by side.
 */
export function ReorderArrows({
  index,
  count,
  onMove,
  vertical = false,
  className,
  what,
}: {
  index: number;
  count: number;
  onMove: (by: -1 | 1) => void;
  vertical?: boolean;
  className?: string;
  /** For screen readers: what is moved, e.g. "კითხვა 3" (appended to the label). */
  what?: string;
}) {
  const t = useT();
  const label = (key: "list.up" | "list.down") => (what ? `${t(key)}: ${what}` : t(key));
  const button = "rounded-full p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:p-2";
  return (
    <div
      className={cn("inline-flex shrink-0 items-center rounded-full border bg-card p-0.5 shadow-xs", vertical && "flex-col", className)}
      data-reorder=""
    >
      <IconButton label={label("list.up")} disabled={index <= 0} onClick={() => onMove(-1)} className={button} data-move="up">
        <ChevronUp className="size-4" aria-hidden="true" />
      </IconButton>
      <IconButton label={label("list.down")} disabled={index >= count - 1} onClick={() => onMove(1)} className={button} data-move="down">
        <ChevronDown className="size-4" aria-hidden="true" />
      </IconButton>
    </div>
  );
}
