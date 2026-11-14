/**
 * All subject toolkits in one list. The rest of the app asks
 * `getToolkit(test.subjectId)` and never mentions a subject by name.
 *
 * Adding a subject (e.g. music):
 *   1. ids.ts            add "music" to SUBJECT_IDS (and any name aliases)
 *   2. src/subjects/music/index.ts   its toolkit (copy geography's to start)
 *      src/subjects/music/print.css  its print styles, imported in globals.css
 *   3. below             add it to TOOLKITS
 *   4. dictionaries.ts   "subject.music" (+ "subjectHint.music") in ka and en
 *   5. globals.css       a --subject-music colour (light + dark) and --color-subject-music
 * TypeScript points at anything that's still missing.
 */
import { biologyToolkit } from "./biology";
import { chemistryToolkit } from "./chemistry";
import { geographyToolkit } from "./geography";
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
  biology: biologyToolkit,
  geography: geographyToolkit,
  history: historyToolkit,
  georgian: georgianToolkit,
  english: englishToolkit,
};

/** Every toolkit, in picker order. */
export const SUBJECTS: SubjectToolkit[] = SUBJECT_IDS.map((id) => TOOLKITS[id]);

export function getToolkit(id: SubjectId): SubjectToolkit {
  return TOOLKITS[id] ?? TOOLKITS[DEFAULT_SUBJECT];
}
