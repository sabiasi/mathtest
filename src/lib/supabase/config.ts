/**
 * The two Supabase settings, read from .env.local (see .env.example).
 *
 * Variables starting with NEXT_PUBLIC_ are copied into the browser code —
 * that's fine for these two: the URL and the *publishable* key are public by
 * design. What protects the data is Row Level Security in the database
 * (supabase/schema.sql). A secret key must never get a NEXT_PUBLIC_ name.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** False until .env.local has been filled in — the app then shows setup help. */
export const supabaseConfigured = SUPABASE_URL.startsWith("https://") && SUPABASE_KEY.length > 20;

/** Where Supabase stores the teachers' pictures (a private "bucket"). */
export const IMAGE_BUCKET = "images";
