import { Landmark } from "lucide-react";
import { QUESTION_TYPES } from "@/lib/questions";
import type { SubjectToolkit } from "../types";
import { HISTORY_TOOLBAR } from "./toolbar";

/**
 * History: chronological order, timelines, sources and maps as extra
 * question types; matching templates (person ↔ date…); a toolbar for dates
 * and centuries (Roman numerals, ძვ. წ. / ახ. წ., BC / AD). No formulas.
 */
export const historyToolkit: SubjectToolkit = {
  id: "history",
  Icon: Landmark,
  colors: { icon: "text-subject-history", chip: "bg-subject-history/12" },
  status: "ready",
  formulas: false,
  toolbar: HISTORY_TOOLBAR,
  questionTypes: [...QUESTION_TYPES, "order", "timeline", "source", "map"],
  diagrams: [],
  matchingTemplates: [
    { id: "person-event", left: { ka: "პიროვნება", en: "Person" }, right: { ka: "მოვლენა", en: "Event" } },
    { id: "person-date", left: { ka: "პიროვნება", en: "Person" }, right: { ka: "თარიღი", en: "Date" } },
    { id: "event-date", left: { ka: "მოვლენა", en: "Event" }, right: { ka: "თარიღი", en: "Date" } },
    { id: "place-event", left: { ka: "ადგილი", en: "Place" }, right: { ka: "მოვლენა", en: "Event" } },
    { id: "term-meaning", left: { ka: "ცნება", en: "Term" }, right: { ka: "განმარტება", en: "Meaning" } },
  ],
  print: { className: "subject-history" },
};
