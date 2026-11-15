import { Suspense } from "react";
import { ReceiptView } from "@/features/billing/ReceiptView";

// "/billing/receipt/<payment id>": a printable receipt (the signed-in teacher's own payments only). <Suspense> is needed because the page reads the address.
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" />}>
      <ReceiptView />
    </Suspense>
  );
}
