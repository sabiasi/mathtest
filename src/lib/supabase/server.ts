import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/**
 * Supabase on the server (route handlers like /auth/callback and /api/pdf).
 * It reads the sign-in cookies of the current request, and can write new
 * ones (e.g. after a sign-in link is opened).
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Called from a place that can't set cookies — proxy.ts refreshes them instead.
        }
      },
    },
  });
}
