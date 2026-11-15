"use client";

import { useSyncExternalStore } from "react";
import { getShares, subscribeShares } from "@/lib/sharing/sharesStore";

const SERVER = { userId: null, email: "", status: "idle" as const, shares: [], links: [] };

/** Who the signed-in teacher shared their tests with: `{ status, shares, links }`. */
export function useShares() {
  return useSyncExternalStore(subscribeShares, getShares, () => SERVER);
}
