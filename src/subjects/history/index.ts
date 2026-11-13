import { Landmark } from "lucide-react";
import { QUESTION_TYPES } from "@/lib/questions";
import type { SubjectToolkit } from "../types";

/**
 * History — PLACEHOLDER. Its own tools (timelines, maps, sources…) come
 * later. No formula toolbar: history questions are text.
 */
export const historyToolkit: SubjectToolkit = {
  id: "history",
  Icon: Landmark,
  colors: { icon: "text-subject-history", chip: "bg-subject-history/12" },
  status: "placeholder",
  formulas: false,
  toolbar: [],
  questionTypes: QUESTION_TYPES,
  print: { className: "subject-history" },
};
