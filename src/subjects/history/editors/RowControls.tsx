"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useT } from "@/i18n/language";

/** Move an item one place up or down in a list. */
export function move<T>(items: T[], index: number, by: -1 | 1): T[] {
  const target = index + by;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** ↑ ↓ ✕ buttons for one row of a list. */
export function RowControls({
  index,
  count,
  min,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  /** Fewer rows than this can't be left (the remove button is disabled). */
  min: number;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const t = useT();
  return (
    <div className="flex shrink-0 items-center">
      <IconButton label={t("list.up")} disabled={index === 0} onClick={() => onMove(-1)} className="p-1.5">
        <ArrowUp className="size-4" aria-hidden="true" />
      </IconButton>
      <IconButton label={t("list.down")} disabled={index === count - 1} onClick={() => onMove(1)} className="p-1.5">
        <ArrowDown className="size-4" aria-hidden="true" />
      </IconButton>
      <IconButton label={t("list.remove")} tone="danger" disabled={count <= min} onClick={onRemove} className="p-1.5">
        <X className="size-4" aria-hidden="true" />
      </IconButton>
    </div>
  );
}

export const addButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-primary-soft disabled:opacity-40";
