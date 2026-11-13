"use client";

import Link from "next/link";
import { useT } from "@/i18n/language";

export function AppFooter() {
  const t = useT();
  return (
    <footer className="border-t print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 text-sm text-muted-foreground sm:px-6">
        <span>MathTest — {t("footer.tagline")}</span>
        <div className="flex gap-5">
          <Link href="/pricing" className="rounded font-medium hover:text-foreground">
            {t("footer.pricing")}
          </Link>
          <Link href="/about" className="rounded font-medium hover:text-foreground">
            {t("footer.about")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
