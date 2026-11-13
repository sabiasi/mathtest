import { LandingGate } from "@/features/landing/LandingGate";

// "/": the landing page for first-time visitors; returning teachers are sent
// straight to "My tests" (/tests). See LandingGate.
export default function HomePage() {
  return <LandingGate />;
}
