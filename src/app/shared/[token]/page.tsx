import { Suspense } from "react";
import { PrintSkeleton } from "@/features/print/PrintView";
import { SharedLinkView } from "@/features/sharing/SharedLinkView";

// /shared/<token> — a test opened by its view-only link (no account needed).
// <Suspense> is needed because the page reads the URL (the token).
export default function SharedLinkPage() {
  return (
    <Suspense fallback={<PrintSkeleton />}>
      <SharedLinkView />
    </Suspense>
  );
}
