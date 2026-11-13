"use client";

import { motion } from "motion/react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fieldClasses } from "./input";

/** Shared look for <select> dropdowns and other plain form controls. */
export const inputClasses = cn(fieldClasses, "h-10");

/** A label above a form control. Clicking the label focuses the control. */
export function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      {children}
    </label>
  );
}

/** The text above a control (also used where the control isn't inside a <label>). */
export function FieldLabel({ children, hint, id }: { children: ReactNode; hint?: string; id?: string }) {
  return (
    <span id={id} className="mb-1.5 block text-sm font-medium text-soft-foreground">
      {children}
      {hint && <span className="font-normal text-muted-foreground"> ({hint})</span>}
    </span>
  );
}

/**
 * Two or more buttons where exactly one (or none) is selected.
 * The highlight slides to the chosen option (Motion's `layoutId`).
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: { value: T; label: ReactNode; activeClass?: string }[];
  onChange: (value: T) => void;
}) {
  const pillId = useId();
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap rounded-lg bg-muted p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 pointer-coarse:py-2.5",
              active ? (option.activeClass ? "text-white" : "text-foreground") : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                aria-hidden="true"
                className={cn("absolute inset-0 rounded-md shadow-sm", option.activeClass ?? "bg-card dark:bg-accent")}
                transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
