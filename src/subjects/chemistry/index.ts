import { FlaskConical } from "lucide-react";
import { QUESTION_TYPES } from "@/lib/questions";
import { MATH_TOOLBAR } from "../math/toolbar";
import type { SubjectToolkit } from "../types";

/**
 * Chemistry — PLACEHOLDER. Its own tools (formulas like H₂O, reactions,
 * the periodic table…) come later. Until then it borrows the basic tab
 * from math, so simple formulas already work.
 */
export const chemistryToolkit: SubjectToolkit = {
  id: "chemistry",
  Icon: FlaskConical,
  colors: { icon: "text-subject-chemistry", chip: "bg-subject-chemistry/12" },
  status: "placeholder",
  formulas: true,
  toolbar: MATH_TOOLBAR.filter((tab) => ["basic", "greek"].includes(tab.id)),
  questionTypes: QUESTION_TYPES,
  print: { className: "subject-chemistry" },
};
