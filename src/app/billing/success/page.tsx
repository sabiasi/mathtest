import { Suspense } from "react";
import { BillingSuccessView } from "@/features/billing/BillingResultViews";

// "/billing/success": back from the bank page; waits for the confirmed payment. <Suspense> is needed because the page reads the address.
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" />}>
      <BillingSuccessView />
    </Suspense>
  );
}
