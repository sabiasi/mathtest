"use client";

import { LANGUAGES, LANGUAGE_NAMES } from "@/i18n/dictionaries";
import { useAuth } from "@/features/auth/AuthProvider";
import { setLanguage, useLanguage, useT } from "@/i18n/language";
import { cn } from "@/lib/utils";

/** Short names for small screens. */
const SHORT: Record<string, string> = { ka: "ქა", en: "EN" };

export function LanguageSwitcher() {
  const t = useT();
  const current = useLanguage();
  const { status, updateProfile } = useAuth();

  return (
    <div role="group" aria-label={t("language.label")} className="inline-flex rounded-lg bg-muted p-0.5 text-sm">
      {LANGUAGES.map((language) => {
        const active = language === current;
        return (
          <button
            key={language}
            type="button"
            lang={language}
            aria-pressed={active}
            onClick={() => {
              setLanguage(language);
              // Signed in: remember it in the account, so it applies on every computer.
              if (status === "signed-in") void updateProfile({ language });
            }}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-[color,background-color,box-shadow] duration-150 pointer-coarse:py-2",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="max-sm:sr-only">{LANGUAGE_NAMES[language]}</span>
            <span className="sm:hidden" aria-hidden="true">
              {SHORT[language]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
