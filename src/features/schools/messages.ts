"use client";

import { toast } from "sonner";
import { useT } from "@/i18n/language";
import type { ApiAnswer } from "@/lib/schools/api";

/** Results the school functions answer with (`{ result }`); each has a message `mySchool.result.<code>`. */
export const SCHOOL_RESULTS = ["invalid", "full", "ended", "alreadyMember", "lastAdmin", "self", "tooMany", "seatsInUse", "paying"] as const;
export type SchoolResult = "ok" | (typeof SCHOOL_RESULTS)[number];

/**
 * Turns an answer into a toast for the teacher; true = it worked.
 * Request problems (`mySchool.error.*`) and the functions' own results (`mySchool.result.*`) both get plain Georgian words.
 */
export function useSchoolReport() {
  const t = useT();
  return (answer: ApiAnswer<{ result?: string }>): boolean => {
    if (!answer.ok) {
      toast.error(t(`mySchool.error.${answer.error}`));
      return false;
    }
    const result = answer.body.result;
    if (result === undefined || result === "ok") return true;
    toast.error(SCHOOL_RESULTS.includes(result as (typeof SCHOOL_RESULTS)[number]) ? t(`mySchool.result.${result as (typeof SCHOOL_RESULTS)[number]}`) : t("mySchool.error.failed"));
    return false;
  };
}
