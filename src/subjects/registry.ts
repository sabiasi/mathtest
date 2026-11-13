/**
 * All subject toolkits in one list. The rest of the app asks
 * `getToolkit(test.subjectId)` and never mentions a subject by name.
 *
 * Adding a subject (e.g. biology):
 *   1. ids.ts            add "biology" to SUBJECT_IDS (and any name aliases)
 *   2. src/subjects/biology/index.ts   its toolkit (copy history's to start)
 *      src/subjects/biology/print.css  its print styles, imported in globals.css
 *   3. below             add it to TOOLKITS
 *   4. dictionaries.ts   "subject.biology" (+ "subjectHint.biology") in ka and en
 *   5. globals.css       a --subject-biology colour (light + dark) and --color-subject-biology
 * TypeScript points at anything that's still missing.
 */
import { chemistryToolkit } from "./chemistry";
import { georgianToolkit } from "./georgian";
import { historyToolkit } from "./history";
import { DEFAULT_SUBJECT, SUBJECT_IDS, type SubjectId } from "./ids";
import { mathToolkit } from "./math";
import { englishToolkit } from "./english";
import { physicsToolkit } from "./physics";
import type { SubjectToolkit } from "./types";

const TOOLKITS: Record<SubjectId, SubjectToolkit> = {
  math: mathToolkit,
  physics: physicsToolkit,
  chemistry: chemistryToolkit,
  history: historyToolkit,
  georgian: georgianToolkit,
  english: englishToolkit,
};

/** Every toolkit, in picker order. */
export const SUBJECTS: SubjectToolkit[] = SUBJECT_IDS.map((id) => TOOLKITS[id]);

export function getToolkit(id: SubjectId): SubjectToolkit {
  return TOOLKITS[id] ?? TOOLKITS[DEFAULT_SUBJECT];
}
