"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { useGuestTrial } from "@/features/auth/GuestTrial";
import { useTeachingSubjects } from "@/features/subjects/TeachingSubjectsProvider";
import { useT } from "@/i18n/language";
import { copyImagesToAccount, ImageStorageFullError } from "@/lib/images/imageStore";
import { createTestFromTemplate } from "@/lib/storage/testsRepository";
import type { Test } from "@/lib/storage/types";

/**
 * "Make my own copy" of a test a colleague shared: a new test of MY own
 * (new ids, my school), with its pictures copied into my picture space — so
 * the copy stays complete even if the sharing stops later.
 */
export function useCopyShared() {
  const t = useT();
  const router = useRouter();
  const access = useTeachingSubjects();
  const trial = useGuestTrial();
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  async function copy(test: Test) {
    if (busy || !access.requestSubject(test.subjectId)) return;
    if (!(await trial.request())) return;
    setBusy(true);
    try {
      await copyImagesToAccount(test);
      const made = createTestFromTemplate(test, { title: test.title ? t("shared.copyTitle", { title: test.title }) : "", schoolName: profile?.school_name ?? test.schoolName, folder: "" });
      toast.success(t("shared.copied"));
      router.push(`/editor/${made.id}`);
    } catch (error) {
      toast.error(t(error instanceof ImageStorageFullError ? "shared.copyFull" : "shared.copyFailed"));
    } finally {
      setBusy(false);
    }
  }
  return { copy, busy };
}
