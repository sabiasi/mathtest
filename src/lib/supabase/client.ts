"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from "./config";

let client: SupabaseClient | null = null;

/**
 * The Supabase connection used in the browser (one shared instance).
 * It keeps the sign-in in cookies, so the server (proxy.ts, route handlers)
 * knows who is signed in too.
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseConfigured) throw new Error("Supabase is not configured: fill in .env.local (see .env.example)");
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
