"use client";

import { useSyncExternalStore } from "react";
import { getBank, subscribeBank } from "@/lib/bank/bankStore";

const SERVER = { userId: null, status: "idle" as const, items: [] };

/** The signed-in teacher's question bank: `{ status, items }` (re-renders when it changes). */
export function useBank() {
  return useSyncExternalStore(subscribeBank, getBank, () => SERVER);
}
