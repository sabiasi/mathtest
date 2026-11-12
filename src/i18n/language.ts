"use client";

/**
 * Remembers the chosen language (in localStorage) and gives components
 * a `t()` function that turns a message key into text.
 */
import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  dictionaries,
  type Language,
  type MessageKey,
} from "./dictionaries";

const STORAGE_KEY = "mathtest:language";
const listeners = new Set<() => void>();
// Used only if the browser blocks localStorage (some privacy settings do).
let memoryFallback: Language | undefined;

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language);
}

function readLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isLanguage(saved) ? saved : DEFAULT_LANGUAGE;
  } catch {
    return memoryFallback ?? DEFAULT_LANGUAGE;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function setLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    memoryFallback = language; // works until the page is reloaded
  }
  listeners.forEach((listener) => listener());
}

/** The current language. The server always renders Georgian. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, readLanguage, () => DEFAULT_LANGUAGE);
}

/** Fills `{name}` placeholders: format("Hi {name}", { name: "Nino" }) → "Hi Nino". */
function format(text: string, values?: Record<string, string | number>) {
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** Returns `t`, which translates a key into the current language. */
export function useT() {
  const language = useLanguage();
  return useCallback(
    (key: MessageKey, values?: Record<string, string | number>) =>
      format(dictionaries[language][key], values),
    [language],
  );
}
