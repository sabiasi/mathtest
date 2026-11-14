"use client";

import { useId } from "react";
import { useT } from "@/i18n/language";
import { cn } from "@/lib/utils";
import type { SubjectId } from "@/subjects/ids";
import { SUBJECTS, getToolkit } from "@/subjects/registry";

/** The subject's icon in a small coloured square. */
export function SubjectIcon({ id, className, iconClassName }: { id: SubjectId; className?: string; iconClassName?: string }) {
  const { Icon, colors } = getToolkit(id);
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-xl p-2", colors.chip, colors.icon, className)}>
      <Icon className={cn("size-5", iconClassName)} aria-hidden="true" />
    </span>
  );
}

/**
 * Choose one subject (settings, test header). Real radio buttons underneath,
 * so the keyboard (arrow keys) and screen readers work as usual.
 */
export function SubjectPicker({
  value,
  onChange,
  label,
  compact = false,
  subjects,
}: {
  value: SubjectId;
  onChange: (id: SubjectId) => void;
  label: string;
  /** Small chips in a row (test header) instead of cards with a hint (settings). */
  compact?: boolean;
  subjects?: readonly SubjectId[];
}) {
  const t = useT();
  const name = useId();
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className={cn(compact ? "flex flex-wrap gap-2" : "grid gap-2 sm:grid-cols-2")}>
        {SUBJECTS.filter(({ id }) => !subjects || subjects.includes(id)).map(({ id }) => (
          <label
            key={id}
            data-subject={id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border bg-card text-left transition-[background-color,border-color,box-shadow] duration-150 hover:border-primary-soft-border hover:bg-primary-soft/40",
              "has-checked:border-ring has-checked:bg-primary-soft/60 has-checked:shadow-xs has-focus-visible:ring-2 has-focus-visible:ring-ring",
              compact ? "py-1.5 pr-3 pl-1.5" : "p-3",
            )}
          >
            <input
              type="radio"
              name={name}
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
              className="sr-only"
            />
            <SubjectIcon id={id} className={compact ? "rounded-lg p-1.5" : undefined} iconClassName={compact ? "size-4" : undefined} />
            <span className="min-w-0">
              <span className={cn("block font-medium text-foreground", compact && "text-sm")}>{t(`subject.${id}`)}</span>
              {!compact && <span className="block text-sm text-muted-foreground">{t(`subjectHint.${id}`)}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
