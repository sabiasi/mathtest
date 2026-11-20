/**
 * The sample tests ("ნიმუში"): one per subject, stored as data in this
 * folder (one file per subject). They are read-only: they are never saved,
 * every visitor sees the same one, and "Use as template" makes an editable
 * copy (testsRepository.createTestFromTemplate).
 *
 * Adding a sample for a new subject: write src/samples/<id>.ts (copy one
 * that is close), add it below; samples.test.ts checks it uses every
 * question type of its toolkit and that its answer key is complete.
 *
 * Teachers see the sample WITHOUT the question types hidden for the teacher
 * trial (`sampleFor`, lib/offeredTypes.ts); `fullSampleFor` is the whole file.
 */
import { withoutHiddenTypes } from "@/lib/offeredTypes";
import type { Test } from "@/lib/storage/types";
import type { SubjectId } from "@/subjects/ids";
import { SAMPLE_PREFIX, isSampleId } from "./build";
import { biologySample } from "./biology";
import { chemistrySample } from "./chemistry";
import { englishSample } from "./english";
import { geographySample } from "./geography";
import { georgianSample } from "./georgian";
import { historySample } from "./history";
import { mathSample } from "./math";
import { physicsSample } from "./physics";

const BUILDERS: Record<SubjectId, () => Test> = {
  math: mathSample,
  physics: physicsSample,
  chemistry: chemistrySample,
  biology: biologySample,
  geography: geographySample,
  history: historySample,
  georgian: georgianSample,
  english: englishSample,
};

const cache = new Map<SubjectId, Test>();
const fullCache = new Map<SubjectId, Test>();

export { SAMPLE_PREFIX, isSampleId };

/** The whole sample of a subject, every question type included (built once, then reused). */
export function fullSampleFor(subjectId: SubjectId): Test {
  let test = fullCache.get(subjectId);
  if (!test) {
    test = BUILDERS[subjectId]();
    fullCache.set(subjectId, test);
  }
  return test;
}

/** The sample test teachers see: without the question types hidden for the teacher trial. */
export function sampleFor(subjectId: SubjectId): Test {
  let test = cache.get(subjectId);
  if (!test) {
    test = withoutHiddenTypes(fullSampleFor(subjectId));
    cache.set(subjectId, test);
  }
  return test;
}

/** The sample with this id ("sample-physics"), or null. */
export function getSample(id: string): Test | null {
  if (!isSampleId(id)) return null;
  const subjectId = id.slice(SAMPLE_PREFIX.length) as SubjectId;
  return subjectId in BUILDERS ? sampleFor(subjectId) : null;
}
