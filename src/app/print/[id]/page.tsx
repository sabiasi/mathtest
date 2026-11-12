import { Suspense } from "react";
import { PrintView } from "@/features/print/PrintView";

// /print/<id>?version=student|key — the A4 preview, print and PDF page.
// <Suspense> is needed because the page reads the URL (id and ?version).
export default function PrintPage() {
  return (
    <Suspense fallback={<div className="h-72" aria-busy="true" />}>
      <PrintView />
    </Suspense>
  );
}
