"use client";

import { LANGUAGES, LANGUAGE_NAMES } from "@/i18n/dictionaries";
import { setLanguage, useLanguage, useT } from "@/i18n/language";

export function LanguageSwitcher() {
  const t = useT();
  const current = useLanguage();

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-sm"
    >
      {LANGUAGES.map((language) => {
        const active = language === current;
        return (
          <button
            key={language}
            type="button"
            lang={language}
            aria-pressed={active}
            onClick={() => setLanguage(language)}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {LANGUAGE_NAMES[language]}
          </button>
        );
      })}
    </div>
  );
}
