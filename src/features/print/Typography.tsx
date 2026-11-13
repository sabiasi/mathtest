"use client";

/**
 * Print-only text polishing. For Georgian Language & Literature tests the
 * paper uses Georgian quotation marks „…“ and long dashes (lib/typography.ts);
 * for other subjects text is printed exactly as typed.
 */
import { createContext, useContext, type ReactNode } from "react";
import { georgianTypography } from "@/lib/typography";

const asTyped = (text: string) => text;
const TypographyContext = createContext<(text: string) => string>(asTyped);

export function TypographyProvider({ georgian, children }: { georgian: boolean; children: ReactNode }) {
  return <TypographyContext.Provider value={georgian ? georgianTypography : asTyped}>{children}</TypographyContext.Provider>;
}

/** The function that turns typed text into printed text. */
export function useTypography(): (text: string) => string {
  return useContext(TypographyContext);
}
