/**
 * The cloud side of the tests repository: the `tests` table in Supabase.
 * Each row holds one whole test as JSON (`data`), plus its title and dates
 * (handy for sorting and for looking at the table in the dashboard).
 *
 * Which rows a teacher may read or write is decided by the database's
 * Row Level Security rules (supabase/schema.sql), not by this code.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeTest } from "./migrate";
import type { TestsBackend } from "./testsRepository";
import type { Test } from "./types";

export function supabaseTestsBackend(supabase: SupabaseClient, userId: string): TestsBackend {
  return {
    async list() {
      const { data, error } = await supabase.from("tests").select("data").order("updated_at", { ascending: false });
      if (error) throw error;
      // Upgrade tests saved by older versions of the app to the current shape.
      return (data ?? []).map((row) => normalizeTest(row.data)).filter((test): test is Test => test !== null);
    },

    async upsert(test) {
      // "upsert" = insert, or update if this (user, id) row already exists.
      const { error } = await supabase.from("tests").upsert(
        {
          user_id: userId,
          id: test.id,
          title: test.title.slice(0, 500),
          data: test,
          created_at: test.createdAt,
          updated_at: test.updatedAt,
        },
        { onConflict: "user_id,id" },
      );
      if (error) throw error;
    },

    async remove(id) {
      const { error } = await supabase.from("tests").delete().eq("user_id", userId).eq("id", id);
      if (error) throw error;
    },
  };
}
