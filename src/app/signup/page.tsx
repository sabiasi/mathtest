import { Suspense } from "react";
import { SignUpView } from "@/features/auth/SignUpView";

// The sign-up page. <Suspense> is needed because it reads the address (?next=…).
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" />}>
      <SignUpView />
    </Suspense>
  );
}
