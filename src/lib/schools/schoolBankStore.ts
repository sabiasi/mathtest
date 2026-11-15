"use client";

/**
 * The school's shared question bank (School plan): questions the teachers of
 * one school share, filed by subject and department. Read and written through
 * /api/school/bank… — the database decides who may (a seat in an ACTIVE
 * school whose plan has "sharedBank"). Loaded when first needed.
 */
import { useSyncExternalStore } from "react";
import { bankItemFromRow, questionForBank, summaryOf, type BankItem } from "@/lib/bank/bank";
import type { Question } from "@/lib/storage/types";
import type { SubjectId } from "@/subjects/ids";
import { apiGet, apiPost, type ApiFailure } from "./api";

export type SchoolBankItem = BankItem & { authorId: string | null; authorName: string; department: string; mine: boolean };
type State = { status: "idle" | "loading" | "ready" | "error"; items: SchoolBankItem[] };

const EMPTY: State = { status: "idle", items: [] };
let state = EMPTY;
const listeners = new Set<() => void>();
function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const getSchoolBank = () => state;
export function useSchoolBank(): State {
  return useSyncExternalStore(subscribe, getSchoolBank, () => EMPTY);
}

export function schoolBankItemFromRow(raw: unknown): SchoolBankItem | null {
  const base = bankItemFromRow(raw);
  if (!base) return null;
  const row = raw as Record<string, unknown>;
  return {
    ...base,
    authorId: typeof row.user_id === "string" ? row.user_id : null,
    authorName: typeof row.author_name === "string" ? row.author_name : "",
    department: typeof row.department === "string" ? row.department : "",
    mine: row.mine === true,
  };
}

/** Loads the school's questions (again). */
export async function loadSchoolBank(): Promise<void> {
  if (state.status === "loading") return;
  set({ status: "loading" });
  const answer = await apiGet<{ items: unknown[] }>("/api/school/bank");
  if (answer.ok) set({ status: "ready", items: answer.body.items.map(schoolBankItemFromRow).filter((item): item is SchoolBankItem => item !== null) });
  else set({ status: answer.error === "notReady" ? "ready" : "error", items: [] });
}
export const resetSchoolBank = () => set(EMPTY);

/** "Save to the school bank": a copy of the question, filed under the test's subject and grade and my department. */
export async function shareWithSchool(question: Question, filing: { subject: SubjectId; grade: string; department: string }): Promise<"ok" | ApiFailure> {
  const data = questionForBank(question);
  const answer = await apiPost<{ id: string }>("/api/school/bankAdd", {
    subject: filing.subject, department: filing.department, grade: filing.grade, type: data.type, tags: [], summary: summaryOf(data), data,
  });
  if (!answer.ok) return answer.error;
  if (state.status === "ready") void loadSchoolBank();
  return "ok";
}

export async function removeFromSchoolBank(id: string): Promise<"ok" | "invalid" | ApiFailure> {
  const answer = await apiPost<{ result: string }>("/api/school/bankRemove", { id });
  if (!answer.ok) return answer.error;
  if (answer.body.result !== "ok") return "invalid";
  set({ items: state.items.filter((item) => item.id !== id) });
  return "ok";
}
