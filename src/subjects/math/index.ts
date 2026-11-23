import { Sigma } from "lucide-react";
import { QUESTION_TYPES } from "@/lib/questions";
import type { SubjectToolkit } from "../types";
import { MATH_SHORTCUTS, MATH_TOOLBAR } from "./toolbar";

/** Mathematics: the full formula toolbar (7 tabs). */
export const mathToolkit: SubjectToolkit = {
  id: "math",
  Icon: Sigma,
  colors: { icon: "text-subject-math", chip: "bg-subject-math/12" },
  status: "ready",
  formulas: true,
  toolbar: MATH_TOOLBAR,
  typingShortcuts: MATH_SHORTCUTS,
  questionTypes: QUESTION_TYPES,
  diagrams: ["geometry"],
  // The video guide (every math question type, with chapters): tutorials/math-all-types.spec.ts.
  guideVideo: "math-all-types",
  // …also as a corner card in the editor, once per visit (picture: math-all-types.ka.jpg).
  guideCard: true,
  // Open answers: blank room for the solution, not ruled lines.
  print: { className: "subject-math", openAnswerSpace: "blank" },
};
