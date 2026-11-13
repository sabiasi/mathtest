import { Suspense } from "react";
import { ForgotPasswordView } from "@/features/auth/ForgotPasswordView";

// The "forgot your password" page. <Suspense> is needed because it reads the address (?next=…).
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" />}>
      <ForgotPasswordView />
    </Suspense>
  );
}
