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
    kind: "cloud",
    userId,
    async list() {
      const tests: Test[] = [];
      // Load every page: incomplete lists must never feed image cleanup.
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase.from("tests").select("data").eq("user_id", userId)
          .order("id").range(offset, offset + pageSize - 1);
        if (error) throw error;
        tests.push(...(data ?? []).map((row) => normalizeTest(row.data)).filter((test): test is Test => test !== null));
        if (!data || data.length < pageSize) break;
      }
      return tests;
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
