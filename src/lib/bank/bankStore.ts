/**
 * The question bank's storage: the `bank_questions` table in Supabase.
 *
 * Like tests, the bank is loaded once after sign-in and kept in memory, so
 * pages show it at once. Who may read or write a row is decided by the
 * database (Row Level Security in supabase/schema.sql), not by this code:
 * only the owner sees a row, and only a plan with the question bank may add.
 */
import { keepImages } from "@/lib/images/imageStore";
import type { Question } from "@/lib/storage/types";
import { getSupabase } from "@/lib/supabase/client";
import type { SubjectId } from "@/subjects/ids";
import { bankImageIds, bankItemFromRow, parseTags, questionForBank, summaryOf, type BankItem } from "./bank";

const COLUMNS = "id, subject, grade, type, tags, data, created_at";

type State = { userId: string | null; status: "idle" | "loading" | "ready" | "error"; items: BankItem[] };
let state: State = { userId: null, status: "idle", items: [] };
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  // Pictures inside bank questions are in use: tell picture clean-up (only once the bank is really known).
  if (state.status === "ready") keepImages("bank", bankImageIds(state.items));
  listeners.forEach((listener) => listener());
}

export function subscribeBank(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const getBank = () => state;

/** "The table doesn't exist": the bank's SQL isn't applied to this database yet. */
const tableMissing = (error: { code?: string } | null) => error?.code === "42P01" || error?.code === "PGRST205";

/** Loads the signed-in teacher's bank (called after sign-in; again by "Try again"). */
export async function loadBank(userId: string): Promise<void> {
  if (state.userId === userId && (state.status === "loading" || state.status === "ready")) return;
  set({ userId, status: "loading", items: [] });
  try {
    const { data, error } = await getSupabase().from("bank_questions").select(COLUMNS).order("created_at", { ascending: false }).limit(2000);
    if (state.userId !== userId) return; // signed out (or another account) meanwhile
    if (error && !tableMissing(error)) throw error;
    const items = (data ?? []).map(bankItemFromRow).filter((item): item is BankItem => item !== null);
    set({ status: "ready", items });
  } catch (error) {
    if (state.userId !== userId) return;
    console.error("MathTest: could not load the question bank", error);
    set({ status: "error" });
  }
}

/** Sign-out: forget the bank. */
export function resetBank(): void {
  if (state.userId === null && state.status === "idle") return;
  keepImages("bank", null);
  set({ userId: null, status: "idle", items: [] });
}

export function retryBank(): void {
  const userId = state.userId;
  if (!userId) return;
  state = { ...state, status: "idle" };
  void loadBank(userId);
}

export type BankResult = "ok" | "premium" | "full" | "failed";

function resultOf(error: { code?: string } | null): BankResult {
  if (!error) return "ok";
  if (error.code === "42501") return "premium"; // refused by the plan rule
  if (error.code === "54000") return "full";
  return "failed";
}

/** "Save to my bank": stores a copy of the question, filed under the test's subject and grade. */
export async function saveToBank(question: Question, filing: { subject: SubjectId; grade: string; tags?: string[] }): Promise<BankResult> {
  if (!state.userId) return "failed";
  const data = questionForBank(question);
  try {
    const { data: row, error } = await getSupabase()
      .from("bank_questions")
      .insert({ subject: filing.subject, grade: filing.grade.trim().slice(0, 40), type: data.type, tags: filing.tags ?? [], summary: summaryOf(data), data })
      .select(COLUMNS)
      .single();
    if (error) return resultOf(error);
    const item = bankItemFromRow(row);
    if (item) set({ items: [item, ...state.items] });
    return "ok";
  } catch {
    return "failed";
  }
}

export async function setBankTags(id: string, tags: string[]): Promise<BankResult> {
  const clean = parseTags(tags.join(","));
  try {
    const { error } = await getSupabase().from("bank_questions").update({ tags: clean }).eq("id", id);
    if (error) return resultOf(error);
    set({ items: state.items.map((item) => (item.id === id ? { ...item, tags: clean } : item)) });
    return "ok";
  } catch {
    return "failed";
  }
}

export async function removeFromBank(id: string): Promise<BankResult> {
  try {
    const { error } = await getSupabase().from("bank_questions").delete().eq("id", id);
    if (error) return resultOf(error);
    set({ items: state.items.filter((item) => item.id !== id) });
    return "ok";
  } catch {
    return "failed";
  }
}
