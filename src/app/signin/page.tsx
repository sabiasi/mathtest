import { Suspense } from "react";
import { SignInView } from "@/features/auth/SignInView";

// The sign-in page. <Suspense> is needed because it reads the address (?next=…).
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" />}>
      <SignInView />
    </Suspense>
  );
}
