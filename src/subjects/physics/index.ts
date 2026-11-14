import { Atom } from "lucide-react";
import { QUESTION_TYPES } from "@/lib/questions";
import type { SubjectToolkit } from "../types";
import { MATH_SHORTCUTS } from "../math/toolbar";
import { PHYSICS_SEARCH_EXTRA, PHYSICS_TOOLBAR } from "./toolbar";

/**
 * Physics: the whole math toolbar plus units (Latin or Georgian letters),
 * vectors, Δ, a × 10ⁿ, constants and ready-made formulas; the
 * "Given / Find / Solution" problem layout; circuit and force diagrams.
 */
export const physicsToolkit: SubjectToolkit = {
  id: "physics",
  Icon: Atom,
  colors: { icon: "text-subject-physics", chip: "bg-subject-physics/12" },
  status: "ready",
  formulas: true,
  toolbar: PHYSICS_TOOLBAR,
  searchExtra: PHYSICS_SEARCH_EXTRA,
  typingShortcuts: MATH_SHORTCUTS,
  questionTypes: [...QUESTION_TYPES, "given-find"],
  diagrams: ["circuit", "forces"],
  print: { className: "subject-physics" },
};
