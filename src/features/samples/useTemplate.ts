"use client";

import { useTeachingSubjects } from "@/features/subjects/TeachingSubjectsProvider";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { useGuestTrial } from "@/features/auth/GuestTrial";
import { useT } from "@/i18n/language";
import { createTestFromTemplate } from "@/lib/storage/testsRepository";
import type { Test } from "@/lib/storage/types";
import { templateTitle } from "@/samples/build";

/** "Use as template": makes the teacher's own editable copy of a sample and opens it. */
export function useUseAsTemplate() {
  const router = useRouter();
  const t = useT();
  const access = useTeachingSubjects();
  const { profile } = useAuth();
  const trial = useGuestTrial();
  return async (sample: Test) => {
    if (!access.requestSubject(sample.subjectId)) return;
    // A guest's copy is their one free trial test (looking at samples is always free).
    if (!(await trial.request())) return;
    const copy = createTestFromTemplate(sample, {
      title: templateTitle(sample.title),
      // The teacher's school (from Settings), not the sample's made-up one.
      schoolName: profile?.school_name ?? "",
    });
    toast.success(t("sample.copied"));
    router.push(`/editor/${copy.id}`);
  };
}
