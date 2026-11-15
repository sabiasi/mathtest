"use client";

/**
 * Knows who is signed in, and their profile. Any component can ask with
 * `useAuth()`.
 *
 * - Signed in: tests and pictures are loaded from the cloud. Any tests made
 *   as a guest in this browser are moved into the account first.
 * - Signed out ("guest"): tests and pictures are kept in this browser only,
 *   so visitors can try everything without an account.
 */
import type { User } from "@supabase/supabase-js";
import { useTheme } from "next-themes";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { setLanguage, useLanguage } from "@/i18n/language";
import { loadProfile, saveProfile, type Profile, type ProfileChanges } from "@/lib/auth/profile";
import { clearImageCache, keepImages, setImageUser } from "@/lib/images/imageStore";
import { normalizePaperHeader } from "@/lib/paperHeader";
import { localTestsBackend } from "@/lib/storage/localTests";
import { supabaseTestsBackend } from "@/lib/storage/supabaseTests";
import { hasUnsavedChanges, startSync, stopSync } from "@/lib/storage/testsRepository";
import { getSupabase } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

type AuthStatus = "loading" | "signed-out" | "signed-in" | "unconfigured";

type Auth = {
  status: AuthStatus;
  /** True for visitors without an account (their tests stay in this browser). */
  guest: boolean;
  user: User | null;
  /** null while loading (or if it couldn't be loaded). */
  profile: Profile | null;
  /** Saves profile changes (name, school, language…). Returns false on failure. */
  updateProfile: (changes: ProfileChanges) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

/** A display name: profile name, Google name, or the part of the email before "@". */
export function displayName(user: User | null, profile: Profile | null): string {
  const meta = user?.user_metadata ?? {};
  return profile?.full_name || meta.full_name || meta.name || user?.email?.split("@")[0] || "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(supabaseConfigured ? "loading" : "unconfigured");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { setTheme } = useTheme();
  const language = useLanguage();
  const activeUserId = useRef<string | null>(null);
  // ---- Listen for sign-in / sign-out ----
  useEffect(() => {
    // The PDF server's Chrome gets its test handed over: nothing to load.
    if (window.__MATHTEST_PRINT__) return;

    /** No account: tests and pictures live in this browser. */
    const beginGuest = () => {
      stopSync();
      setImageUser(null);
      void startSync(localTestsBackend());
    };

    if (!supabaseConfigured) {
      beginGuest();
      return () => stopSync();
    }
    const supabase = getSupabase();

    const begin = async (next: User) => {
      stopSync(); // forget the guest tests in memory (they're moved below)
      setImageUser(next.id);
      const profileLoad = loadProfile(supabase, next.id, displayName(next, null)).catch((error) => {
        console.error("MathTest: could not load the profile", error);
        return null;
      });
      await startSync(supabaseTestsBackend(supabase, next.id));
      if (activeUserId.current !== next.id) return;
      const loaded = await profileLoad;
      if (loaded && activeUserId.current === next.id) setProfile(loaded);
    };

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      setUser(next);
      setStatus(next ? "signed-in" : "signed-out");
      if (next?.id === activeUserId.current) return; // just a token refresh
      activeUserId.current = next?.id ?? null;
      setProfile(null);
      // Supabase asks not to call it again from inside this callback: do it a moment later.
      setTimeout(() => {
        if (next) void begin(next);
        else beginGuest();
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // ---- The profile's language and theme apply on every computer ----
  const applied = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || applied.current === profile.id) return;
    applied.current = profile.id;
    if (profile.language !== language) setLanguage(profile.language);
    setTheme(profile.theme);
  }, [profile, language, setTheme]);

  // ---- The header's logo is a picture in use: picture clean-up must keep it ----
  useEffect(() => {
    if (!profile) return;
    const logo = normalizePaperHeader(profile.paper_header).logoImageId;
    keepImages("header", logo ? [logo] : []);
  }, [profile]);

  // ---- Warn before closing the tab while changes are still being sent ----
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const updateProfile = useCallback(
    async (changes: ProfileChanges) => {
      if (!user) return false;
      try {
        await saveProfile(getSupabase(), user.id, changes);
        setProfile((p) => (p ? { ...p, ...changes } : p));
        return true;
      } catch (error) {
        console.error("MathTest: could not save the profile", error);
        return false;
      }
    },
    [user],
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const loaded = await loadProfile(getSupabase(), user.id, displayName(user, null));
    if (activeUserId.current === user.id) setProfile(loaded);
  }, [user]);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    stopSync();
    setImageUser(null);
    await clearImageCache();
    // A full page load clears everything from memory (shared school computers).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload is the point here
    window.location.assign("/");
  }, []);

  const guest = status === "signed-out" || status === "unconfigured";
  const value = useMemo(
    () => ({ status, guest, user, profile, updateProfile, signOut, refreshProfile }),
    [status, guest, user, profile, updateProfile, signOut, refreshProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
