"use client";

import { PageTransition } from "@/components/PageTransition";
import { useT } from "@/i18n/language";
import type { MessageKey } from "@/i18n/dictionaries";
import { DraftNotice } from "./LegalViews";

const SECTIONS: [MessageKey, MessageKey][] = [
  ["privacy.accountTitle", "privacy.account"],
  ["privacy.guestTitle", "privacy.guest"],
  ["privacy.trialTitle", "privacy.trial"],
  ["privacy.settingsTitle", "privacy.settings"],
  ["privacy.paymentsTitle", "privacy.payments"],
  ["privacy.emailsTitle", "privacy.emails"],
  ["privacy.sharingTitle", "privacy.sharing"],
  ["privacy.schoolTitle", "privacy.school"],
  ["privacy.aiTitle", "privacy.ai"],
];

/** /privacy: a short, plain description of what Rapido stores, including the free-trial cookie. */
export function PrivacyView() {
  const t = useT();
  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("privacy.title")}</h1>
      <DraftNotice />
      <p className="mt-4 text-[15px] leading-relaxed text-soft-foreground">{t("privacy.intro")}</p>
      {SECTIONS.map(([title, text]) => (
        <section key={title} className="mt-8" id={title === "privacy.trialTitle" ? "trial-cookie" : undefined}>
          <h2 className="text-lg font-semibold">{t(title)}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-soft-foreground">{t(text)}</p>
        </section>
      ))}
    </PageTransition>
  );
}
