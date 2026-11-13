import { BookOpenText } from "lucide-react";
import { QUESTION_TYPES } from "@/lib/questions";
import type { SubjectToolkit } from "../types";

/**
 * Georgian Language & Literature — PLACEHOLDER. Its own tools (reading
 * texts, grammar exercises…) come later. No formula toolbar.
 */
export const georgianToolkit: SubjectToolkit = {
  id: "georgian",
  Icon: BookOpenText,
  colors: { icon: "text-subject-georgian", chip: "bg-subject-georgian/12" },
  status: "placeholder",
  formulas: false,
  toolbar: [],
  questionTypes: QUESTION_TYPES,
  diagrams: [],
  print: { className: "subject-georgian" },
};
