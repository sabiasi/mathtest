import { Suspense } from "react";
import { MockCheckoutView } from "@/features/billing/MockCheckoutView";

// "/checkout/mock": the pretend bank page of the mock payment provider (test mode only). <Suspense> is needed because the page reads the address.
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" />}>
      <MockCheckoutView />
    </Suspense>
  );
}
