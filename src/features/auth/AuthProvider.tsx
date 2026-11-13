"use client";

/**
 * Knows who is signed in, and their profile. Any component can ask with
 * `useAuth()`. When someone signs in, it starts loading their tests and
 * pictures from the cloud; on sign-out it forgets them again.
 */
import type { User } from "@supabase/supabase-js";
import { useTheme } from "next-themes";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { setLanguage, useLanguage } from "@/i18n/language";
import { loadProfile, saveProfile, type Profile, type ProfileChanges } from "@/lib/auth/profile";
import { clearImageCache, setImageUser } from "@/lib/images/imageStore";
import { supabaseTestsBackend } from "@/lib/storage/supabaseTests";
import { hasUnsavedChanges, startSync, stopSync } from "@/lib/storage/testsRepository";
import { getSupabase } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

type AuthStatus = "loading" | "signed-out" | "signed-in" | "unconfigured";

type Auth = {
  status: AuthStatus;
  user: User | null;
  /** null while loading (or if it couldn't be loaded). */
  profile: Profile | null;
  /** Saves profile changes (name, school, language…). Returns false on failure. */
  updateProfile: (changes: ProfileChanges) => Promise<boolean>;
  signOut: () => Promise<void>;
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
    if (!supabaseConfigured || window.__MATHTEST_PRINT__) return;
    const supabase = getSupabase();

    const begin = async (next: User) => {
      setImageUser(next.id);
      void startSync(supabaseTestsBackend(supabase, next.id));
      try {
        const loaded = await loadProfile(supabase, next.id, displayName(next, null));
        if (activeUserId.current === next.id) setProfile(loaded);
      } catch (error) {
        console.error("MathTest: could not load the profile", error);
      }
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
        else {
          stopSync();
          setImageUser(null);
        }
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

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    stopSync();
    setImageUser(null);
    await clearImageCache();
    // A full page load clears everything from memory (shared school computers).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload is the point here
    window.location.assign("/");
  }, []);

  const value = useMemo(() => ({ status, user, profile, updateProfile, signOut }), [status, user, profile, updateProfile, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
