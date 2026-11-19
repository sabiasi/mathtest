import { SchoolBankView } from "@/features/schools/SchoolBankView";
import { redirect } from "next/navigation";
import { HIDDEN_FOR_TESTING } from "@/lib/hiddenForTesting";

// /school/bank — the school's shared question bank (School plan).
export default function SchoolBankPage() {
  if (HIDDEN_FOR_TESTING.premium) redirect("/tests"); // HIDDEN_FOR_TESTING
  return <SchoolBankView />;
}
