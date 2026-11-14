"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { useT } from "@/i18n/language";
import { createTestFromTemplate } from "@/lib/storage/testsRepository";
import type { Test } from "@/lib/storage/types";
import { templateTitle } from "@/samples/build";

/** "Use as template": makes the teacher's own editable copy of a sample and opens it. */
export function useUseAsTemplate() {
  const router = useRouter();
  const t = useT();
  const { profile } = useAuth();
  return (sample: Test) => {
    const copy = createTestFromTemplate(sample, {
      title: templateTitle(sample.title),
      // The teacher's school (from Settings), not the sample's made-up one.
      schoolName: profile?.school_name ?? "",
    });
    toast.success(t("sample.copied"));
    router.push(`/editor/${copy.id}`);
  };
}
