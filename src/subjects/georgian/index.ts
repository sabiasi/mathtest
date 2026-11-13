import { BookOpenText } from "lucide-react";
import { QUESTION_TYPES } from "@/lib/questions";
import type { SubjectToolkit } from "../types";
import { GEORGIAN_TOOLBAR } from "./toolbar";

/**
 * Georgian Language & Literature: reading texts with numbered lines, poems,
 * grammar exercises (mark words, case/screeve tables, find the mistake,
 * sentence analysis), essays; Georgian quotation marks and dashes on paper.
 * Teachers paste their own texts — nothing literary is built in.
 */
export const georgianToolkit: SubjectToolkit = {
  id: "georgian",
  Icon: BookOpenText,
  colors: { icon: "text-subject-georgian", chip: "bg-subject-georgian/12" },
  status: "ready",
  formulas: false,
  toolbar: GEORGIAN_TOOLBAR,
  questionTypes: [
    "passage",
    "poem",
    ...QUESTION_TYPES,
    "mark-words",
    "grammar-table",
    "find-mistake",
    "sentence-analysis",
    "essay",
  ],
  diagrams: [],
  matchingTemplates: [
    { id: "author-work", left: { ka: "ავტორი", en: "Author" }, right: { ka: "ნაწარმოები", en: "Work" } },
    { id: "work-character", left: { ka: "ნაწარმოები", en: "Work" }, right: { ka: "პერსონაჟი", en: "Character" } },
    { id: "author-character", left: { ka: "ავტორი", en: "Author" }, right: { ka: "პერსონაჟი", en: "Character" } },
    { id: "term-meaning", left: { ka: "ტერმინი", en: "Term" }, right: { ka: "განმარტება", en: "Meaning" } },
  ],
  print: { className: "subject-georgian", typography: "georgian" },
};
