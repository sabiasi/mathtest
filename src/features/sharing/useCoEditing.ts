"use client";

/**
 * Who else has this test open right now, and "someone just saved".
 *
 * Uses Supabase Realtime: a "channel" is like a small chat room named after
 * the test. Everyone who opens the test joins it ("presence" = the list of
 * who is in the room), and after each save the editor sends a short "saved"
 * note to the room. No test content ever goes through the channel — the
 * test itself is always read from and saved to the database, where the
 * sharing rules are enforced.
 *
 * Only tests that are really shared join a channel; a teacher working alone
 * never opens this connection.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { displayName, useAuth } from "@/features/auth/AuthProvider";
import { othersPresent, type Person } from "@/lib/sharing/sharing";
import { parseSharedKey } from "@/lib/storage/testsRepository";
import { getSupabase } from "@/lib/supabase/client";
import { useShares } from "./useShares";

type RoomChannel = ReturnType<ReturnType<typeof getSupabase>["channel"]>;

export function useCoEditing(testId: string): { others: Person[]; changedBy: string | null; dismissChange: () => void; announceSaved: () => void } {
  const { user, profile, status } = useAuth();
  const { shares } = useShares();
  const [others, setOthers] = useState<Person[]>([]);
  const [changedBy, setChangedBy] = useState<string | null>(null);
  const channelRef = useRef<RoomChannel | null>(null);
  const userId = status === "signed-in" ? (user?.id ?? null) : null;
  const name = displayName(user, profile);

  // The room's name: the test's owner + its real id (the same for the owner and for colleagues).
  const sharedIds = parseSharedKey(testId);
  const mineIsShared = shares.some((share) => share.testId === testId);
  const room = !userId ? null : sharedIds ? `test:${sharedIds.ownerId}:${sharedIds.testId}` : mineIsShared ? `test:${userId}:${testId}` : null;

  useEffect(() => {
    if (!room || !userId) return;
    const channel = getSupabase().channel(room, { config: { presence: { key: userId } } });
    channelRef.current = channel;
    channel
      .on("presence", { event: "sync" }, () => setOthers(othersPresent(channel.presenceState<{ name?: string }>(), userId)))
      .on("broadcast", { event: "saved" }, ({ payload }) => {
        const by = (payload as { id?: unknown; name?: unknown } | undefined) ?? {};
        if (by.id !== userId) setChangedBy(typeof by.name === "string" ? by.name.slice(0, 60) : "");
      })
      .subscribe((state) => {
        if (state === "SUBSCRIBED") void channel.track({ name });
      });
    return () => {
      channelRef.current = null;
      setOthers([]);
      setChangedBy(null);
      void getSupabase().removeChannel(channel);
    };
  }, [room, userId, name]);

  const announceSaved = useCallback(() => {
    void channelRef.current?.send({ type: "broadcast", event: "saved", payload: { id: userId, name } });
  }, [userId, name]);
  const dismissChange = useCallback(() => setChangedBy(null), []);
  return { others, changedBy, dismissChange, announceSaved };
}
