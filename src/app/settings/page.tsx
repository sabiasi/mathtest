import { SetupGate } from "@/components/SetupGate";
import { SettingsView } from "@/features/settings/SettingsView";

// /settings — profile and preferences (needs sign-in, see proxy.ts).
export default function Page() {
  return (
    <SetupGate>
      <SettingsView />
    </SetupGate>
  );
}
