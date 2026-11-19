import { SchoolAdminView } from "@/features/schools/SchoolAdminView";
import { redirect } from "next/navigation";
import { HIDDEN_FOR_TESTING } from "@/lib/hiddenForTesting";

// /school — the school admin's page (seats, invitations, teachers, usage).
export default function SchoolPage() {
  if (HIDDEN_FOR_TESTING.premium) redirect("/tests"); // HIDDEN_FOR_TESTING
  return <SchoolAdminView />;
}
