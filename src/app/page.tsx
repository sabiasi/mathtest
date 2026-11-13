import { LandingView } from "@/features/landing/LandingView";

// "/": the public landing page. Signed-in teachers are sent to /tests by proxy.ts.
export default function HomePage() {
  return <LandingView />;
}
