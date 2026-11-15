import { Suspense } from "react";
import { BillingFailedView } from "@/features/billing/BillingResultViews";

// "/billing/failed": the payment did not go through (nothing was charged). <Suspense> is needed because the page reads the address.
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" />}>
      <BillingFailedView />
    </Suspense>
  );
}
