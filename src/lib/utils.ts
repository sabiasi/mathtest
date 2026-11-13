import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins CSS class names, skipping empty ones, and lets later Tailwind classes
 * win over earlier ones:  cn("px-4 py-2", big && "px-6")  →  "py-2 px-6".
 * (clsx joins the names; tailwind-merge removes the ones that clash.)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
