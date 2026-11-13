import { Sigma } from "lucide-react";
import { QUESTION_TYPES } from "@/lib/questions";
import type { SubjectToolkit } from "../types";
import { MATH_TOOLBAR } from "./toolbar";

/** Mathematics: the full formula toolbar (7 tabs). */
export const mathToolkit: SubjectToolkit = {
  id: "math",
  Icon: Sigma,
  colors: { icon: "text-subject-math", chip: "bg-subject-math/12" },
  status: "ready",
  formulas: true,
  toolbar: MATH_TOOLBAR,
  questionTypes: QUESTION_TYPES,
  print: { className: "subject-math" },
};
