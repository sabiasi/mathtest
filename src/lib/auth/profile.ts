/**
 * A teacher's profile: the `profiles` table (one row per account).
 * Created automatically on sign-up by a database trigger (schema.sql).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Language } from "@/i18n/dictionaries";

export type ThemeChoice = "light" | "dark" | "system";

export type Profile = {
  id: string;
  full_name: string;
  school_name: string;
  default_subject: string;
  language: Language;
  theme: ThemeChoice;
  /** True once the sample test ("მაგალითი") was added to this account. */
  sample_added: boolean;
};

export type ProfileChanges = Partial<Omit<Profile, "id">>;

const COLUMNS = "id, full_name, school_name, default_subject, language, theme, sample_added";

export async function loadProfile(supabase: SupabaseClient, userId: string, fallbackName: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select(COLUMNS).eq("id", userId).maybeSingle();
  if (error) throw error;
  if (data) return data as Profile;
  // No row yet (e.g. the account existed before the trigger): create it.
  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: userId, full_name: fallbackName })
    .select(COLUMNS)
    .single();
  if (insertError) throw insertError;
  return created as Profile;
}

export async function saveProfile(supabase: SupabaseClient, userId: string, changes: ProfileChanges): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

/** "Nino Beridze" → "NB", "nino@school.ge" → "N". */
export function initials(name: string, email: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0][0].toUpperCase();
  return (email[0] ?? "?").toUpperCase();
}
