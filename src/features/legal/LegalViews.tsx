"use client";

import { FileWarning } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { useT } from "@/i18n/language";
import type { MessageKey } from "@/i18n/dictionaries";

type Section = [title: MessageKey, text: MessageKey];

/**
 * /terms and /refund are DRAFTS: the plain facts of how the app works are
 * written out; everything that is a legal or business decision is a
 * [bracketed placeholder] for the owner and a lawyer. The box on top says so.
 */
export function DraftNotice() {
  const t = useT();
  return (
    <div role="note" data-legal-draft="" className="mt-5 flex items-start gap-3 rounded-xl border border-dashed border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-text">
      <FileWarning className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        <b className="font-semibold">{t("legal.draft.title")}</b> — {t("legal.draft.text")}
      </p>
    </div>
  );
}

function LegalPage({ title, intro, sections }: { title: MessageKey; intro: MessageKey; sections: Section[] }) {
  const t = useT();
  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t(title)}</h1>
      <DraftNotice />
      <p className="mt-5 text-[15px] leading-relaxed text-soft-foreground">{t(intro)}</p>
      {sections.map(([heading, text]) => (
        <section key={heading} className="mt-8">
          <h2 className="text-lg font-semibold">{t(heading)}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-soft-foreground">{t(text)}</p>
        </section>
      ))}
    </PageTransition>
  );
}

export function TermsView() {
  return (
    <LegalPage
      title="terms.title"
      intro="terms.intro"
      sections={[
        ["terms.serviceTitle", "terms.service"],
        ["terms.accountTitle", "terms.account"],
        ["terms.paymentTitle", "terms.payment"],
        ["terms.cancelTitle", "terms.cancel"],
        ["terms.rulesTitle", "terms.rules"],
        ["terms.contactTitle", "terms.contact"],
      ]}
    />
  );
}

export function RefundView() {
  return (
    <LegalPage
      title="refund.title"
      intro="refund.intro"
      sections={[
        ["refund.cancelTitle", "refund.cancel"],
        ["refund.refundTitle", "refund.refund"],
        ["refund.howTitle", "refund.how"],
        ["refund.afterTitle", "refund.after"],
      ]}
    />
  );
}
