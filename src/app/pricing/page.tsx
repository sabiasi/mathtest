import { PricingView } from "@/features/pricing/PricingView";
import { redirect } from "next/navigation";
import { HIDDEN_FOR_TESTING } from "@/lib/hiddenForTesting";

// "/pricing": plans and prices (everyone, signed in or not). The page lives in src/features/pricing.
export default function PricingPage() {
  if (HIDDEN_FOR_TESTING.premium) redirect("/"); // HIDDEN_FOR_TESTING
  return <PricingView />;
}
