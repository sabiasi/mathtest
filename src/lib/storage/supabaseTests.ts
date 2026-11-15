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
import { VersionConflictError, type TestsBackend } from "./testsRepository";
import type { Test } from "./types";

/** "No such column": the sharing SQL (version numbers) isn't applied to this database yet. */
const noColumn = (error: { code?: string } | null) => error?.code === "42703" || error?.code === "PGRST204";

export function supabaseTestsBackend(supabase: SupabaseClient, userId: string): TestsBackend {
  /**
   * The version of each test this browser has seen. The database raises a
   * test's version on every save; a save only goes through while the version
   * is still the one we know — so two people (or two tabs) can't silently
   * overwrite each other. A test with no known version is saved the old way.
   */
  const versions = new Map<string, number>();
  let versioned = true;
  const row = (test: Test) => ({ title: test.title.slice(0, 500), data: test, updated_at: test.updatedAt });

  async function fetch(id: string) {
    if (!versioned) return null;
    const { data, error } = await supabase.from("tests").select("data, version").eq("user_id", userId).eq("id", id).limit(1);
    if (error) throw error;
    const found = data?.[0];
    const test = found ? normalizeTest(found.data) : null;
    if (!test || typeof found?.version !== "number") return null;
    return { test, version: found.version as number, changed: versions.get(id) !== found.version };
  }

  return {
    kind: "cloud",
    userId,
    fetch,
    acceptVersion(id, version) {
      versions.set(id, version);
    },

    async list() {
      const tests: Test[] = [];
      // Load every page: incomplete lists must never feed image cleanup.
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase.from("tests").select(versioned ? "data, version" : "data").eq("user_id", userId)
          .order("id").range(offset, offset + pageSize - 1);
        if (error && versioned && noColumn(error)) {
          // An older database: no version numbers, save like before.
          versioned = false;
          offset = -pageSize;
          tests.length = 0;
          continue;
        }
        if (error) throw error;
        for (const found of (data ?? []) as unknown as { data: unknown; version?: unknown }[]) {
          const test = normalizeTest(found.data);
          if (!test) continue;
          tests.push(test);
          if (typeof found.version === "number") versions.set(test.id, found.version);
        }
        if (!data || data.length < pageSize) break;
      }
      return tests;
    },

    async upsert(test) {
      const known = versioned ? versions.get(test.id) : undefined;
      if (known !== undefined) {
        // Save over the version we know — and only over that one.
        const { data, error } = await supabase.from("tests").update(row(test))
          .eq("user_id", userId).eq("id", test.id).eq("version", known).select("version");
        if (error) throw error;
        const next = data?.[0]?.version;
        if (typeof next === "number") {
          versions.set(test.id, next);
          return;
        }
        if (data && data.length > 0) return; // saved, but the version wasn't told: keep the one we know
        const latest = await fetch(test.id);
        if (latest && latest.version !== known) throw new VersionConflictError(latest.test, latest.version);
        if (latest) throw new Error("The test could not be saved");
        versions.delete(test.id); // deleted somewhere else: put it back below
      }
      // "upsert" = insert, or update if this (user, id) row already exists.
      const write = supabase.from("tests").upsert(
        { user_id: userId, id: test.id, ...row(test), created_at: test.createdAt },
        { onConflict: "user_id,id" },
      );
      if (!versioned) {
        const { error } = await write;
        if (error) throw error;
        return;
      }
      const { data, error } = await write.select("version");
      if (error && noColumn(error)) {
        versioned = false;
        return this.upsert(test);
      }
      if (error) throw error;
      const version = data?.[0]?.version;
      if (typeof version === "number") versions.set(test.id, version);
    },

    async remove(id) {
      versions.delete(id);
      const { error } = await supabase.from("tests").delete().eq("user_id", userId).eq("id", id);
      if (error) throw error;
    },
  };
}
