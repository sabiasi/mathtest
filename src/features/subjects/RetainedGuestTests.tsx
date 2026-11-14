"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { useT } from "@/i18n/language";
import { DEVICE_TEST_PREFIX } from "@/lib/auth/teachingSubjects";
import { useRetainedGuestTests } from "@/lib/storage/useTests";
import { SubjectIcon } from "./SubjectPicker";

/** Account restrictions never erase guest work in a different subject. */
export function RetainedGuestTests() {
  const { status } = useAuth();
  const tests = useRetainedGuestTests();
  const t = useT();
  if (status !== "signed-in" || !tests.length) return null;
  return <section className="mt-8 rounded-2xl border bg-card p-5" data-retained-tests="">
    <h2 className="text-lg font-semibold">{t("teaching.retainedTitle")}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{t("teaching.retainedText")}</p>
    <ul className="mt-4 space-y-3">
      {tests.map((test) => <li key={test.id} className="flex flex-wrap items-center gap-3">
        <SubjectIcon id={test.subjectId} />
        <span className="flex-1">{test.title || t("test.untitled")}</span>
        <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/editor/${encodeURIComponent(DEVICE_TEST_PREFIX + test.id)}`}>
          {t("teaching.view")}
        </Link>
      </li>)}
    </ul>
  </section>;
}
