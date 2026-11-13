import { FlaskConical } from "lucide-react";
import { QUESTION_TYPES } from "@/lib/questions";
import type { SubjectToolkit } from "../types";
import { CHEMISTRY_TOOLBAR } from "./toolbar";

/**
 * Chemistry: chemical formulas typed like "H2SO4" (mhchem, drawn by
 * MathLive), reactions with conditions, ions, states, oxidation states, a
 * periodic table; "balance the equation" questions; structural formulas.
 */
export const chemistryToolkit: SubjectToolkit = {
  id: "chemistry",
  Icon: FlaskConical,
  colors: { icon: "text-subject-chemistry", chip: "bg-subject-chemistry/12" },
  status: "ready",
  formulas: true,
  chemistry: true,
  toolbar: CHEMISTRY_TOOLBAR,
  questionTypes: [...QUESTION_TYPES, "balance", "given-find"],
  diagrams: ["structure"],
  print: { className: "subject-chemistry" },
};
