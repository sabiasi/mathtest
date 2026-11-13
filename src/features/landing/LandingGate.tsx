"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { hasStarted } from "@/lib/onboarding";
import { LandingView } from "./LandingView";

const noSubscription = () => () => {};

/**
 * "/": first-time visitors see the landing page; teachers who already use
 * MathTest go straight to "My tests". (The server can't see localStorage,
 * so it sends an empty page and the browser decides a moment later —
 * that way daily users never see the landing page flash by.)
 */
export function LandingGate() {
  const router = useRouter();
  const started = useSyncExternalStore(noSubscription, hasStarted, () => null);

  useEffect(() => {
    if (started) router.replace("/tests");
  }, [started, router]);

  if (started !== false) return <div className="min-h-[70vh]" aria-busy="true" />;
  return <LandingView />;
}
