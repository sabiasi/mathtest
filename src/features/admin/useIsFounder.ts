"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiGet } from "@/lib/schools/api";

/** Asked once per signed-in user (and remembered): is this account a founder? Only decides whether the menu shows "Admin". */
const answers = new Map<string, Promise<boolean>>();

export function useIsFounder(): boolean {
  const { status, user } = useAuth();
  const userId = status === "signed-in" ? (user?.id ?? null) : null;
  const [founder, setFounder] = useState<{ userId: string; value: boolean } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let answer = answers.get(userId);
    if (!answer) {
      answer = apiGet<{ admin: boolean }>("/api/admin/check").then((result) => result.ok && result.body.admin === true);
      answers.set(userId, answer);
    }
    let cancelled = false;
    void answer.then((value) => { if (!cancelled) setFounder({ userId, value }); });
    return () => { cancelled = true; };
  }, [userId]);
  return founder !== null && founder.userId === userId && founder.value;
}
