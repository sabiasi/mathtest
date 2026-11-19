import { BankView } from "@/features/bank/BankView";
import { redirect } from "next/navigation";
import { HIDDEN_FOR_TESTING } from "@/lib/hiddenForTesting";

// "/bank": the teacher's own question bank (Premium). The page lives in src/features/bank.
export default function BankPage() {
  if (HIDDEN_FOR_TESTING.questionBank || HIDDEN_FOR_TESTING.premium) redirect("/tests"); // HIDDEN_FOR_TESTING
  return <BankView />;
}
