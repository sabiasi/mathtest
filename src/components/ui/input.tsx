import * as React from "react";
import { cn } from "@/lib/utils";

/** Shared look for text boxes, text areas and dropdowns (<select>). */
export const fieldClasses = cn(
  "w-full min-w-0 rounded-lg border border-input bg-card px-3 text-[15px] text-foreground shadow-xs",
  "transition-[border-color,box-shadow] duration-150 outline-none",
  "placeholder:text-muted-foreground hover:border-muted-foreground/50",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(fieldClasses, "h-10", className)} {...props} />;
}

export { Input };
