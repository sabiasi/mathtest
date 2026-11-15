"use client";

/** /shared/<token>: a test opened by its view-only link — the paper, to look at and print. No account needed. */
import { Link2Off, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { EmptyState } from "@/components/EmptyState";
import { PageTransition } from "@/components/PageTransition";
import { buttonVariants } from "@/components/ui/button";
import { PrintSkeleton, PrintView } from "@/features/print/PrintView";
import { useT } from "@/i18n/language";
import { getLinkState, loadLinkedTest, subscribeLinks } from "@/lib/storage/sharedTests";
import { LINK_PREFIX } from "@/lib/storage/testsRepository";
import { getSupabase } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

export function SharedLinkView() {
  const t = useT();
  const { token } = useParams<{ token: string }>();
  useEffect(() => {
    // The PDF server's Chrome gets the test handed over: nothing to load.
    if (!window.__MATHTEST_PRINT__) loadLinkedTest(supabaseConfigured ? getSupabase() : null, token);
  }, [token]);
  const state = useSyncExternalStore(subscribeLinks, () => getLinkState(token), () => null);

  if (!state || state.status === "loading") return <PrintSkeleton />;
  if (state.status === "missing") {
    return (
      <PageTransition className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState
          Icon={Link2Off}
          title={t("shared.linkMissingTitle")}
          text={t("shared.linkMissingText")}
          actions={<Link href="/" className={buttonVariants({ variant: "outline" })}>{t("shared.linkHome")}</Link>}
        />
      </PageTransition>
    );
  }
  const name = state.linked.ownerName;
  return (
    <div data-shared-link="">
      <p className="flex items-center justify-center gap-2 border-b bg-primary-soft px-4 py-2 text-center text-sm text-soft-foreground print:hidden" role="status">
        <Users className="size-4 shrink-0 text-brand" aria-hidden="true" />
        {name ? t("shared.linkBanner", { name }) : t("shared.linkBannerUnknown")}
      </p>
      <PrintView id={LINK_PREFIX + token} />
    </div>
  );
}
