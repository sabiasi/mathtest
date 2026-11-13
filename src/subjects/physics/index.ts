import { Atom } from "lucide-react";
import { QUESTION_TYPES } from "@/lib/questions";
import { MATH_TOOLBAR } from "../math/toolbar";
import type { SubjectToolkit } from "../types";

/**
 * Physics — PLACEHOLDER. Its own tools (units, vectors, circuits…) come
 * later. Until then it borrows the basic, algebra and Greek-letter tabs
 * from math, so formulas already work.
 */
export const physicsToolkit: SubjectToolkit = {
  id: "physics",
  Icon: Atom,
  colors: { icon: "text-subject-physics", chip: "bg-subject-physics/12" },
  status: "placeholder",
  formulas: true,
  toolbar: MATH_TOOLBAR.filter((tab) => ["basic", "algebra", "greek"].includes(tab.id)),
  questionTypes: QUESTION_TYPES,
  print: { className: "subject-physics" },
};
