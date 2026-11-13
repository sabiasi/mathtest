import { SetupGate } from "@/components/SetupGate";
import { HomeView } from "@/features/home/HomeView";

// "/tests": My tests. The page itself lives in src/features/home.
export default function TestsPage() {
  return (
    <SetupGate>
      <HomeView />
    </SetupGate>
  );
}
