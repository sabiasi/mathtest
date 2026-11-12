"use client";

import { useEffect } from "react";
import { useLanguage } from "./language";

/**
 * Keeps <html lang="…"> in sync with the chosen language. Browsers use it
 * for screen readers, spell-checking and choosing the right hyphenation.
 */
export function HtmlLang() {
  const language = useLanguage();
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return null;
}
