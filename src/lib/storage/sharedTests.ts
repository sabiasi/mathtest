/**
 * The cloud side of SHARING: tests other teachers shared with me, and tests
 * opened by a read-only link. (My own tests are in supabaseTests.ts.)
 *
 * Who may read or change what is decided by the database (Row Level Security
 * in supabase/schema.sql, "Sharing and co-editing"), not by this code.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeTest } from "./migrate";
import { LINK_PREFIX, parseSharedKey, sharedKey, VersionConflictError, type SharedBackend, type SharedTest } from "./testsRepository";
import type { Test } from "./types";

/** "No such function / table": the sharing SQL isn't applied to this database yet. */
export const sharingMissing = (error: { code?: string } | null) =>
  error?.code === "PGRST202" || error?.code === "42883" || error?.code === "42P01" || error?.code === "PGRST205" || error?.code === "42703";

type SharedRow = { owner_id?: unknown; owner_name?: unknown; role?: unknown; version?: unknown; data?: unknown };

function fromRow(row: SharedRow): SharedTest | null {
  const test = normalizeTest(row.data);
  if (!test || typeof row.owner_id !== "string" || typeof row.version !== "number") return null;
  const key = sharedKey(row.owner_id, test.id);
  return {
    key,
    ownerId: row.owner_id,
    ownerName: typeof row.owner_name === "string" ? row.owner_name : "",
    role: row.role === "edit" ? "edit" : "view",
    version: row.version,
    // Inside the app the test carries the "shared~…" id; its real id goes back in when saving.
    test: { ...test, id: key },
  };
}

export function supabaseSharedBackend(supabase: SupabaseClient): SharedBackend {
  async function fetch(shared: SharedTest) {
    const ids = parseSharedKey(shared.key);
    if (!ids) return null;
    const { data, error } = await supabase.from("tests").select("data, version").eq("user_id", ids.ownerId).eq("id", ids.testId).limit(1);
    if (error) throw error;
    const found = data?.[0];
    const test = found ? normalizeTest(found.data) : null;
    return test && typeof found?.version === "number" ? { test: { ...test, id: shared.key }, version: found.version as number } : null;
  }

  return {
    fetch,
    async list() {
      const { data, error } = await supabase.rpc("tests_shared_with_me");
      if (error && sharingMissing(error)) return [];
      if (error) throw error;
      return ((data ?? []) as SharedRow[]).map(fromRow).filter((entry): entry is SharedTest => entry !== null);
    },

    async save(shared, test) {
      const ids = parseSharedKey(shared.key);
      if (!ids) return "gone";
      const { data, error } = await supabase.from("tests")
        .update({ title: test.title.slice(0, 500), data: { ...test, id: ids.testId }, updated_at: test.updatedAt })
        .eq("user_id", ids.ownerId).eq("id", ids.testId).eq("version", shared.version).select("version");
      if (error) throw error;
      const next = data?.[0]?.version;
      if (typeof next === "number") return next;
      // Nothing was saved: find out why.
      const latest = await fetch(shared);
      if (!latest) return "gone";
      if (latest.version !== shared.version) throw new VersionConflictError(latest.test, latest.version);
      return "readonly";
    },
  };
}

// ---------------------------------------------------------------------------
// Read-only links
// ---------------------------------------------------------------------------

export type LinkedTest = { ownerId: string; ownerName: string; testId: string; test: Test };

/** The test behind a read-only link, or null (wrong or switched-off link). Works signed out too. */
export async function fetchLinkedTest(supabase: SupabaseClient, token: string): Promise<LinkedTest | null> {
  if (!/^[0-9a-f]{32,64}$/.test(token)) return null;
  const { data, error } = await supabase.rpc("test_by_link", { link_token: token });
  if (error && sharingMissing(error)) return null;
  if (error) throw error;
  const found = data as { owner_id?: unknown; owner_name?: unknown; data?: unknown } | null;
  const test = normalizeTest(found?.data);
  if (!test || typeof found?.owner_id !== "string") return null;
  return { ownerId: found.owner_id, ownerName: typeof found.owner_name === "string" ? found.owner_name : "", testId: test.id, test: { ...test, id: LINK_PREFIX + token } };
}

type LinkState = { status: "loading" } | { status: "missing" } | { status: "ready"; linked: LinkedTest };
const links = new Map<string, LinkState>();
const linkListeners = new Set<() => void>();
const LOADING: LinkState = { status: "loading" };

export function subscribeLinks(listener: () => void): () => void {
  linkListeners.add(listener);
  return () => { linkListeners.delete(listener); };
}
export const getLinkState = (token: string): LinkState => links.get(token) ?? LOADING;

/** Starts loading a link's test (once); pages read it with useTest("link~<token>"). */
export function loadLinkedTest(supabase: SupabaseClient | null, token: string): void {
  if (links.has(token)) return;
  const set = (state: LinkState) => { links.set(token, state); linkListeners.forEach((listener) => listener()); };
  if (!supabase) return set({ status: "missing" });
  set(LOADING);
  fetchLinkedTest(supabase, token).then(
    (linked) => set(linked ? { status: "ready", linked } : { status: "missing" }),
    () => set({ status: "missing" }),
  );
}

/** Which shared test (by link) uses this picture? */
export function linkedTestsUsing(uses: (test: Test) => boolean): { ownerId: string; testId: string }[] {
  return [...links.values()].flatMap((state) => (state.status === "ready" && uses(state.linked.test) ? [{ ownerId: state.linked.ownerId, testId: state.linked.testId }] : []));
}
