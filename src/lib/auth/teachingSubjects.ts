import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entitlements } from "@/lib/plans/entitlements";
import { isSubjectId, SUBJECT_IDS, type SubjectId } from "@/subjects/ids";

/** Subject assignments are not administrator roles. Only the database RPC writes them. */
export type TeachingSubjects = { subjects: SubjectId[]; completedAt: string };

export function activeTeachingSubjects(assignment: TeachingSubjects | null, entitlements: Entitlements): SubjectId[] {
  if (!assignment || !assignment.completedAt) return [];
  const subjects = SUBJECT_IDS.filter((id) => assignment.subjects.includes(id));
  // An expired multi-subject account must explicitly choose its one remaining subject.
  return !entitlements.features.multipleSubjects && subjects.length !== 1 ? [] : subjects;
}

export async function loadTeachingSubjects(client: SupabaseClient, userId: string): Promise<TeachingSubjects | null> {
  const { data, error } = await client.from("teacher_subjects").select("subjects, completed_at").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? { subjects: (data.subjects as unknown[]).filter(isSubjectId), completedAt: data.completed_at } : null;
}

export async function saveTeachingSubjects(client: SupabaseClient, subjects: SubjectId[], defaultSubject: SubjectId): Promise<void> {
  const { error } = await client.rpc("set_teaching_subjects", { chosen: subjects, preferred: defaultSubject });
  if (error) throw error;
}

/** Retained guest tests are readable, but cannot be written into an unauthorized subject. */
export const DEVICE_TEST_PREFIX = "device~";
export const isDeviceTestId = (id: string) => id.startsWith(DEVICE_TEST_PREFIX);
